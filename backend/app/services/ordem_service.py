from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from app.models.models import OrdemProducao, StatusOrdem, PrioridadeOrdem
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
    return get_ordem(db, db_ordem.id)


def update_ordem(db: Session, ordem_id: int, ordem_update: OrdemProducaoUpdate) -> Optional[OrdemProducao]:
    db_ordem = db.query(OrdemProducao).filter(OrdemProducao.id == ordem_id).first()
    if not db_ordem:
        return None
    update_data = ordem_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_ordem, field, value)
    db_ordem.atualizado_em = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_ordem)
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
    """Retorna ordens formatadas para o Gantt com percentual de conclusão e detalhes completos."""
    status_permitidos = [StatusOrdem.PLANEJADA, StatusOrdem.EM_ANDAMENTO, StatusOrdem.PAUSADA]
    if incluir_concluidas:
        status_permitidos.append(StatusOrdem.CONCLUIDA)

    query = db.query(OrdemProducao).options(
        joinedload(OrdemProducao.produto), joinedload(OrdemProducao.maquina)
    ).filter(
        OrdemProducao.status.in_(status_permitidos)
    )
    if data_inicio:
        query = query.filter(OrdemProducao.data_fim_planejada >= data_inicio)
    if data_fim:
        query = query.filter(OrdemProducao.data_inicio_planejada <= data_fim)
    if maquina_id:
        query = query.filter(OrdemProducao.maquina_id == maquina_id)

    ordens = query.order_by(OrdemProducao.data_inicio_planejada).all()

    result = []
    for o in ordens:
        percentual = 0.0
        if o.quantidade_planejada and o.quantidade_planejada > 0:
            percentual = round((o.quantidade_produzida / o.quantidade_planejada) * 100, 1)

        result.append(OrdemGantt(
            id=o.id,
            numero=o.numero,
            produto_nome=o.produto.nome if o.produto else "—",
            produto_codigo=o.produto.codigo if o.produto else None,
            produto_codigo_fundido=o.produto.codigo_fundido if o.produto else None,
            maquina_nome=o.maquina.nome if o.maquina else None,
            maquina_codigo=o.maquina.codigo if o.maquina else None,
            maquina_id=o.maquina_id,
            operacao_codigo=o.maquina.operacao_codigo if o.maquina else None,
            status=o.status,
            prioridade=o.prioridade,
            data_inicio_planejada=o.data_inicio_planejada,
            data_fim_planejada=o.data_fim_planejada,
            quantidade_planejada=o.quantidade_planejada,
            quantidade_produzida=o.quantidade_produzida,
            percentual_conclusao=percentual,
            observacoes=o.observacoes,
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
