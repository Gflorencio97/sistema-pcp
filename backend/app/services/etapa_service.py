"""Calendario de turnos e geracao das etapas de uma OP a partir do roteiro do produto.

Turnos (segunda a sexta):
  1o turno  06:09 -> 15:48   8,8 h produtivas
  2o turno  15:48 -> 01:09   8,3 h produtivas (termina na madrugada do dia seguinte)
Hora extra (HE): horas adicionais por dia, cadastradas na maquina, logo apos o ultimo turno.
"""
from datetime import datetime, time, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.models import EtapaOrdem, Maquina, OrdemProducao, RoteiroProduto, StatusOrdem

TURNO_1 = (time(6, 9), time(15, 48), 8.8)    # inicio, fim, horas produtivas
TURNO_2 = (time(15, 48), time(1, 9), 8.3)    # fim no dia seguinte
LOTE_TRANSFERENCIA = 100   # pecas que a etapa anterior libera antes da proxima comecar


# ---------------------------------------------------------------- calendario
def _turnos_maquina(maq: Optional[Maquina]):
    usa_1 = bool(maq.turno_manha) if maq is not None else True
    usa_2 = bool(maq.turno_tarde) if maq is not None else False
    if not usa_1 and not usa_2:
        usa_1 = True
    return ([TURNO_1] if usa_1 else []) + ([TURNO_2] if usa_2 else [])


def _horas_extras(maq: Optional[Maquina]) -> float:
    return float(getattr(maq, "horas_extras_dia", 0) or 0) if maq is not None else 0.0


def capacidade_dia(maq: Optional[Maquina]) -> float:
    """Horas produtivas por dia util desta linha (turnos + HE)."""
    return sum(t[2] for t in _turnos_maquina(maq)) + _horas_extras(maq)


def _intervalos_dia(maq: Optional[Maquina], d):
    """Janelas de producao do dia 'd': lista de (inicio, fim, horas produtivas por hora de relogio)."""
    if d.weekday() >= 5:
        return []
    out = []
    for hi, hf, prod in _turnos_maquina(maq):
        ini = datetime.combine(d, hi)
        fim = datetime.combine(d, hf)
        if fim <= ini:
            fim += timedelta(days=1)
        span = (fim - ini).total_seconds() / 3600.0
        out.append((ini, fim, prod / span))
    he = _horas_extras(maq)
    if he > 0 and out:
        ult = max(f for _, f, _ in out)
        out.append((ult, ult + timedelta(hours=he), 1.0))
    out.sort()
    return out


def avancar(maq: Optional[Maquina], inicio: datetime, horas: float) -> datetime:
    """Instante em que 'horas' produtivas terminam, partindo de 'inicio', so contando
    as janelas de turno (e HE) da linha. Com horas = 0 devolve o proximo instante produtivo."""
    dt = inicio.replace(tzinfo=None)
    rem = max(0.0, horas)
    dia = dt.date() - timedelta(days=1)       # turno do dia anterior pode virar a madrugada
    for _ in range(800):
        for a, b, r in _intervalos_dia(maq, dia):
            if b <= dt:
                continue
            ini = max(a, dt)
            disp = (b - ini).total_seconds() / 3600.0 * r
            if rem <= disp + 1e-9:
                return ini + timedelta(hours=rem / r)
            rem -= disp
            dt = b
        dia += timedelta(days=1)
    return dt


def horas_produtivas_entre(maq: Optional[Maquina], ini: datetime, fim: datetime) -> float:
    """Horas produtivas que a linha tem disponiveis na janela [ini, fim]."""
    ini, fim = ini.replace(tzinfo=None), fim.replace(tzinfo=None)
    total = 0.0
    dia = ini.date() - timedelta(days=1)
    while dia <= fim.date():
        for a, b, r in _intervalos_dia(maq, dia):
            x, y = max(a, ini), min(b, fim)
            if y > x:
                total += (y - x).total_seconds() / 3600.0 * r
        dia += timedelta(days=1)
    return total


# ------------------------------------------------------------------- roteiro
def _taxa(item: RoteiroProduto) -> Optional[float]:
    t = item.pcs_hora
    if not t or t <= 0:
        return None
    return 1.0 / t if t < 1.0 else t        # mesma convencao da carga de maquina (h/peca)


def sugerir_fim(db: Session, produto_id: int, quantidade: float, maquina_id: int, inicio: datetime) -> Optional[dict]:
    """Data de fim sugerida para produzir 'quantidade' na linha escolhida, pelas pecas/hora
    do roteiro do produto e pelos turnos da linha."""
    maq = db.get(Maquina, maquina_id)
    if maq is None or not quantidade or quantidade <= 0:
        return None
    item = (
        db.query(RoteiroProduto)
        .filter(
            RoteiroProduto.produto_id == produto_id,
            RoteiroProduto.operacao_codigo == maq.operacao_codigo,
            RoteiroProduto.ativo == True,  # noqa: E712
        )
        .first()
    )
    taxa = _taxa(item) if item else None
    if not taxa:
        return None
    horas = quantidade / taxa
    ini = avancar(maq, inicio, 0.0)
    fim = avancar(maq, ini, horas)
    return {
        "data_inicio": ini,
        "data_fim": fim,
        "horas_necessarias": round(horas, 2),
        "pcs_hora": taxa,
        "horas_por_dia": round(capacidade_dia(maq), 2),
    }


def gerar_etapas(db: Session, ordem: OrdemProducao) -> List[EtapaOrdem]:
    db.query(EtapaOrdem).filter(EtapaOrdem.ordem_id == ordem.id).delete()
    if not ordem.data_inicio_planejada or not ordem.quantidade_planejada:
        db.commit()
        return []

    roteiro = (
        db.query(RoteiroProduto)
        .filter(RoteiroProduto.produto_id == ordem.produto_id, RoteiroProduto.ativo == True)  # noqa: E712
        .order_by(RoteiroProduto.ordem)
        .all()
    )
    maq_op = db.get(Maquina, ordem.maquina_id) if ordem.maquina_id else None
    inicio_op = ordem.data_inicio_planejada.replace(tzinfo=None)
    qtd = ordem.quantidade_planejada
    lote = min(LOTE_TRANSFERENCIA, qtd)

    etapas: List[EtapaOrdem] = []
    anterior = None   # dict(fim=..., lote_pronto=...)
    for item in roteiro:
        taxa = _taxa(item)
        if not taxa:
            continue

        maq_id = item.maquina_id
        if maq_op and maq_op.operacao_codigo == item.operacao_codigo:
            maq_id = maq_op.id              # respeita a linha escolhida ao lancar a OP
        maq = db.get(Maquina, maq_id) if maq_id else None

        horas_total = qtd / taxa
        horas_lote = lote / taxa

        eh_ancora = bool(maq_op and maq_op.operacao_codigo == item.operacao_codigo)
        if eh_ancora and ordem.fim_manual and ordem.data_fim_planejada:
            # Fim ajustado a mao: usa exatamente as datas informadas
            t_ini = inicio_op
            t_fim = ordem.data_fim_planejada.replace(tzinfo=None)
        elif eh_ancora:
            # Fim automatico: pecas/hora do produto dentro dos turnos da linha
            t_ini = avancar(maq, inicio_op, 0.0)
            t_fim = avancar(maq, t_ini, horas_total)
            ordem.data_fim_planejada = t_fim
        else:
            if anterior is None:
                t_ini = avancar(maq, inicio_op, 0.0)
            else:
                # Producao em fluxo: comeca quando a etapa anterior ja liberou o 1o lote
                t_ini = avancar(maq, anterior["lote_pronto"], 0.0)
            # Termina pelo proprio ritmo, mas nunca antes da anterior terminar + ultimo lote
            t_fim = avancar(maq, t_ini, horas_total)
            if anterior is not None:
                t_min = avancar(maq, anterior["fim"], horas_lote)
                if t_min > t_fim:
                    t_fim = t_min

        etapas.append(EtapaOrdem(
            ordem_id=ordem.id,
            sequencia=len(etapas) + 1,
            operacao_codigo=item.operacao_codigo,
            operacao_nome=item.operacao_nome,
            maquina_id=maq_id,
            quantidade=qtd,
            pcs_hora=taxa,
            data_inicio_planejada=t_ini,
            data_fim_planejada=t_fim,
        ))
        anterior = {"fim": t_fim, "lote_pronto": avancar(maq, t_ini, horas_lote)}

    db.add_all(etapas)
    db.commit()
    return etapas


def preencher_etapas_existentes(db: Session) -> int:
    """Gera etapas para as OPs que ainda nao tem (uso na inicializacao)."""
    com_etapas = {r[0] for r in db.query(EtapaOrdem.ordem_id).distinct().all()}
    n = 0
    encerradas = [StatusOrdem.CANCELADA, StatusOrdem.CONCLUIDA]
    for o in db.query(OrdemProducao).filter(~OrdemProducao.status.in_(encerradas)).all():
        if o.id in com_etapas:
            continue
        if gerar_etapas(db, o):
            n += 1
    return n
