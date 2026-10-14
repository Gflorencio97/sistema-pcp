from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from app.models.models import OrdemProducao, EtapaOrdem, StatusOrdem, PrioridadeOrdem
from app.services import etapa_service

# False = Gantt como no sistema oficial: uma barra por OP, com as datas digitadas.
# True  = uma barra por etapa do roteiro (producao em fluxo).
GANTT_POR_ETAPA = True
from app.schemas.ordem import OrdemProducaoCreate, OrdemProducaoUpdate, OrdemGantt


def get_ordem(db: Session, ordem_id: int) -> Optional[OrdemProducao]:
    return (
        db.query(OrdemProducao)
        .options(joinedload(OrdemProducao.produto), joinedload(OrdemProducao.maquina))
        .filter(OrdemProducao.id == ordem_id)
        .first()
    )


def get_ordem_by_numero(db: Session, numero: str) -> Optional[OrdemProducao]:
    return db.query(OrdemProducao).filter(OrdemProducao.numero == numero).first()


def get_ordens(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[StatusOrdem] = None,
    maquina_id: Optional[int] = None,
    produto_id: Optional[int] = None,
    prioridade: Optional[PrioridadeOrdem] = None,
    search: Optional[str] = None,
) -> List[OrdemProducao]:
    query = db.query(OrdemProducao).options(
        joinedload(OrdemProducao.produto), joinedload(OrdemProducao.maquina)
    )
    if status:
        query = query.filter(OrdemProducao.status == status)
    if maquina_id:
        query = query.filter(OrdemProducao.maquina_id == maquina_id)
    if produto_id:
        query = query.filter(OrdemProducao.produto_id == produto_id)
    if prioridade:
        query = query.filter(OrdemProducao.prioridade == prioridade)
    if search:
        query = query.filter(OrdemProducao.numero.ilike(f"%{search}%"))
    return query.order_by(OrdemProducao.data_inicio_planejada).offset(skip).limit(limit).all()


def create_ordem(db: Session, ordem: OrdemProducaoCreate) -> OrdemProducao:
    db_ordem = OrdemProducao(**ordem.model_dump())
    db.add(db_ordem)
    db.commit()
    db.refresh(db_ordem)
    etapa_service.gerar_etapas(db, db_ordem)
    return get_ordem(db, db_ordem.id)


def update_ordem(db: Session, ordem_id: int, ordem_update: OrdemProducaoUpdate) -> Optional[OrdemProducao]:
    db_ordem = db.query(OrdemProducao).filter(OrdemProducao.id == ordem_id).first()
    if not db_ordem:
        return None
    update_data = ordem_update.model_dump(exclude_unset=True)
    # Quem altera o fim diretamente (sem informar fim_manual) esta ajustando a mao
    if "data_fim_planejada" in update_data and "fim_manual" not in update_data:
        update_data["fim_manual"] = True
    for field, value in update_data.items():
        setattr(db_ordem, field, value)
    db_ordem.atualizado_em = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_ordem)
    if {"maquina_id", "data_inicio_planejada", "data_fim_planejada", "quantidade_planejada", "produto_id", "fim_manual"} & set(update_data):
        etapa_service.gerar_etapas(db, db_ordem)
    return get_ordem(db, db_ordem.id)


def delete_ordem(db: Session, ordem_id: int) -> bool:
    db_ordem = db.query(OrdemProducao).filter(OrdemProducao.id == ordem_id).first()
    if not db_ordem:
        return False
    db.delete(db_ordem)
    db.commit()
    return True


def get_ordens_gantt(
    db: Session,
    data_inicio: Optional[datetime] = None,
    data_fim: Optional[datetime] = None,
    maquina_id: Optional[int] = None,
    incluir_concluidas: bool = False,
) -> List[OrdemGantt]:
    """Linhas do Gantt: uma por etapa (quando a OP tem etapas) ou uma por OP."""
    status_permitidos = [StatusOrdem.PLANEJADA, StatusOrdem.EM_ANDAMENTO, StatusOrdem.PAUSADA]
    if incluir_concluidas:
        status_permitidos.append(StatusOrdem.CONCLUIDA)

    ordens = (
        db.query(OrdemProducao)
        .options(
            joinedload(OrdemProducao.produto),
            joinedload(OrdemProducao.maquina),
            joinedload(OrdemProducao.etapas).joinedload(EtapaOrdem.maquina),
        )
        .filter(OrdemProducao.status.in_(status_permitidos))
        .order_by(OrdemProducao.data_inicio_planejada)
        .all()
    )

    def naive(dt):
        return dt.replace(tzinfo=None) if dt is not None else None

    di, df = naive(data_inicio), naive(data_fim)

    def na_janela(ini, fim) -> bool:
        ini, fim = naive(ini), naive(fim)
        if di is not None and (fim is None or fim < di):
            return False
        if df is not None and (ini is None or ini > df):
            return False
        return True

    result: List[OrdemGantt] = []
    for o in ordens:
        percentual = 0.0
        if o.quantidade_planejada and o.quantidade_planejada > 0:
            percentual = round((o.quantidade_produzida / o.quantidade_planejada) * 100, 1)

        if GANTT_POR_ETAPA and o.etapas:
            linhas = [
                (e, e.maquina, e.maquina_id, e.data_inicio_planejada, e.data_fim_planejada)
                for e in o.etapas
            ]
        else:
            linhas = [(None, o.maquina, o.maquina_id, o.data_inicio_planejada, o.data_fim_planejada)]

        for e, maq, maq_id, ini, fim in linhas:
            if maquina_id and maq_id != maquina_id:
                continue
            if not na_janela(ini, fim):
                continue

            # Linha escolhida (barra com as datas digitadas): quantos dias faltam de capacidade
            falta = None
            if (
                e is not None and o.maquina is not None and e.pcs_hora and ini and fim
                and e.operacao_codigo == o.maquina.operacao_codigo and e.maquina_id == o.maquina_id
            ):
                necessario = e.quantidade / e.pcs_hora
                disponivel = etapa_service.horas_produtivas_entre(maq, ini, fim)
                deficit = necessario - disponivel
                cap = etapa_service.capacidade_dia(maq) or 8.8
                falta = int(-(-deficit // cap)) if deficit > 0.01 else 0
            result.append(OrdemGantt(
                id=o.id,
                numero=o.numero,
                produto_nome=o.produto.nome if o.produto else "—",
                produto_codigo=o.produto.codigo if o.produto else None,
                produto_codigo_fundido=o.produto.codigo_fundido if o.produto else None,
                maquina_nome=maq.nome if maq else None,
                maquina_codigo=maq.codigo if maq else None,
                maquina_id=maq_id,
                operacao_codigo=(maq.operacao_codigo if maq else None) or (e.operacao_codigo if e else None),
                status=o.status,
                prioridade=o.prioridade,
                data_inicio_planejada=ini,
                data_fim_planejada=fim,
                quantidade_planejada=o.quantidade_planejada,
                quantidade_produzida=o.quantidade_produzida,
                percentual_conclusao=percentual,
                observacoes=o.observacoes,
                etapa_id=e.id if e else None,
                falta_capacidade_dias=falta,
                etapa_seq=e.sequencia if e else None,
                etapa_total=len(o.etapas) if e else None,
                etapa_nome=e.operacao_nome if e else None,
                ordem_maquina_id=o.maquina_id,
                ordem_data_inicio=o.data_inicio_planejada,
                ordem_data_fim=o.data_fim_planejada,
                ordem_fim_manual=bool(o.fim_manual),
                ordem_fim_calculado=(
                    max((x.data_fim_planejada for x in o.etapas if x.data_fim_planejada), default=None)
                    if o.etapas else None
                ),
            ))
    return result


def verificar_conflitos(db: Session, maquina_id: int, data_inicio: datetime, data_fim: datetime, excluir_ordem_id: Optional[int] = None) -> List[OrdemProducao]:
    """Verifica conflitos de agendamento em uma máquina."""
    query = db.query(OrdemProducao).filter(
        and_(
            OrdemProducao.maquina_id == maquina_id,
            OrdemProducao.status.in_([StatusOrdem.PLANEJADA, StatusOrdem.EM_ANDAMENTO]),
            OrdemProducao.data_inicio_planejada < data_fim,
            OrdemProducao.data_fim_planejada > data_inicio,
        )
    )
    if excluir_ordem_id:
        query = query.filter(OrdemProducao.id != excluir_ordem_id)
    return query.all()
