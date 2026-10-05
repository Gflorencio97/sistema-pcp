from sqlalchemy.orm import Session, joinedload
from typing import Dict, List, Optional
from collections import defaultdict

from app.models.models import Maquina, Produto, OrdemProducao, RoteiroProduto, StatusMaquina, StatusOrdem, OPERACOES_FABRICA, SetorMOD
from app.schemas.carga_maquina import (
    CargaMaquinaItem, CargaSetorItem, CargaMaquinaDashboardResponse,
    ItemSimulacao, SetorMODUpdate
)


def _determinar_status(percentual: float) -> str:
    if percentual > 100.0:
        return "sobrecarga"
    elif percentual >= 80.0:
        return "atencao"
    return "normal"


def _determinar_tipo_gargalo(pct_maquina: float, pct_mod: float) -> str:
    if pct_maquina > 100.0 and pct_mod > 100.0:
        return "critico_total"
    elif pct_maquina > 100.0:
        return "gargalo_maquina"
    elif pct_mod > 100.0:
        return "gargalo_mao_de_obra"
    elif pct_maquina >= 80.0 or pct_mod >= 80.0:
        return "atencao"
    return "equilibrado"


def calcular_dashboard_carga_maquina(
    db: Session,
    dias_uteis: int = 22,
    horas_dia_padrao: float = 17.15,
    pedidos_simulados: Optional[List[ItemSimulacao]] = None,
) -> CargaMaquinaDashboardResponse:
    # 1. Obter todas as máquinas ativas
    maquinas = (
        db.query(Maquina)
        .filter(Maquina.status == StatusMaquina.ATIVA)
        .order_by(Maquina.operacao_codigo, Maquina.codigo)
        .all()
    )

    # 2. Obter configurações de MOD por setor
    mod_registros = db.query(SetorMOD).all()
    mod_map: Dict[str, SetorMOD] = {sm.operacao_codigo: sm for sm in mod_registros}

    # 3. Mapa de horas ocupadas por máquina
    horas_ocupadas_map: Dict[int, float] = defaultdict(float)
    ordens_count_map: Dict[int, int] = defaultdict(int)

    # 4. Processar ordens em andamento e planejadas no sistema
    ordens_ativas = (
        db.query(OrdemProducao)
        .options(
            joinedload(OrdemProducao.produto).joinedload(Produto.roteiro),
            joinedload(OrdemProducao.maquina)
        )
        .filter(OrdemProducao.status.in_([StatusOrdem.PLANEJADA, StatusOrdem.EM_ANDAMENTO]))
        .all()
    )

    for op in ordens_ativas:
        qtd_restante = max(0.0, (op.quantidade_planejada or 0.0) - (op.quantidade_produzida or 0.0))
        if qtd_restante <= 0:
            continue

        roteiro_itens = (
            db.query(RoteiroProduto)
            .filter(RoteiroProduto.produto_id == op.produto_id, RoteiroProduto.ativo == True)
            .all()
        )

        etapas_alocadas = 0
        for item in roteiro_itens:
            if item.maquina_id and item.pcs_hora and item.pcs_hora > 0:
                horas = qtd_restante / item.pcs_hora
                horas_ocupadas_map[item.maquina_id] += horas
                ordens_count_map[item.maquina_id] += 1
                etapas_alocadas += 1

        # Se não tiver roteiro distribuído, aloca direto na máquina principal da OP se houver
        if etapas_alocadas == 0 and op.maquina_id:
            horas_ocupadas_map[op.maquina_id] += (qtd_restante / 20.0)
            ordens_count_map[op.maquina_id] += 1

    # 5. Somar pedidos simulados (se houver)
    if pedidos_simulados:
        for sim in pedidos_simulados:
            roteiro_itens = (
                db.query(RoteiroProduto)
                .filter(RoteiroProduto.produto_id == sim.produto_id, RoteiroProduto.ativo == True)
                .all()
            )
            for item in roteiro_itens:
                if item.maquina_id and item.pcs_hora and item.pcs_hora > 0:
                    horas = sim.quantidade / item.pcs_hora
                    horas_ocupadas_map[item.maquina_id] += horas
                    ordens_count_map[item.maquina_id] += 1

    # 6. Mapeamento de nomes de operações
    op_nomes = {op["codigo"]: op["nome"] for op in OPERACOES_FABRICA}

    # 7. Agrupamento por setor / operação
    # Chave por operacao_codigo para garantir consistência com a tabela SetorMOD e Excel
    setores_map: Dict[str, List[CargaMaquinaItem]] = defaultdict(list)
    setor_nomes_map: Dict[str, str] = {}

    total_disp = 0.0
    total_ocup = 0.0
    qtd_sobrecarga = 0
    qtd_atencao = 0
    qtd_normal = 0

    for maq in maquinas:
        h_dia = maq.horas_por_dia if (maq.horas_por_dia and maq.horas_por_dia > 0) else horas_dia_padrao
        h_disp = round(dias_uteis * h_dia, 2)
        h_ocup = round(horas_ocupadas_map[maq.id], 2)
        saldo = round(h_disp - h_ocup, 2)
        pct = round((h_ocup / h_disp) * 100, 1) if h_disp > 0 else 0.0
        status_cap = _determinar_status(pct)

        if status_cap == "sobrecarga":
            qtd_sobrecarga += 1
        elif status_cap == "atencao":
            qtd_atencao += 1
        else:
            qtd_normal += 1

        total_disp += h_disp
        total_ocup += h_ocup

        item_maq = CargaMaquinaItem(
            maquina_id=maq.id,
            codigo=maq.codigo,
            nome=maq.nome,
            setor=maq.setor,
            operacao_codigo=maq.operacao_codigo,
            horas_por_dia=h_dia,
            horas_disponiveis=h_disp,
            horas_ocupadas=h_ocup,
            saldo_horas=saldo,
            percentual_ocupacao=pct,
            status_capacidade=status_cap,
            qtd_ordens=ordens_count_map[maq.id],
        )

        # Chave por código da operação
        op_chave = maq.operacao_codigo or maq.setor or "OUTROS"
        nome_exibicao = op_nomes.get(maq.operacao_codigo or "", maq.setor or "Outros Setores")
        setor_nomes_map[op_chave] = nome_exibicao
        setores_map[op_chave].append(item_maq)

    # 8. Montar lista de setores consolidados com Mão de Obra Direta (MOD)
    setores_consolidados: List[CargaSetorItem] = []
    
    # Ordenar setores pela sequência oficial da fábrica
    ordem_op = {op["codigo"]: op["ordem"] for op in OPERACOES_FABRICA}
    chaves_ordenadas = sorted(setores_map.keys(), key=lambda k: ordem_op.get(k, 99))

    for op_chave in chaves_ordenadas:
        maqs_setor = setores_map[op_chave]
        nome_setor = setor_nomes_map.get(op_chave, op_chave)
        s_disp = round(sum(m.horas_disponiveis for m in maqs_setor), 2)
        s_ocup = round(sum(m.horas_ocupadas for m in maqs_setor), 2)
        s_pct = round((s_ocup / s_disp) * 100, 1) if s_disp > 0 else 0.0
        op_cod = maqs_setor[0].operacao_codigo if maqs_setor else op_chave

        # Cálculo de MOD para este setor
        sm_config = mod_map.get(op_cod)
        mod_disp = sm_config.quantidade_operadores if sm_config else 1.0
        h_dia_op = sm_config.horas_dia_operador if sm_config else 8.35
        
        # Horas mensais de trabalho de 1 operador (ex: 22 dias * 8.35h = 183.7h)
        horas_mes_operador = round(dias_uteis * h_dia_op, 2)
        horas_mod_disp = round(mod_disp * horas_mes_operador, 2)
        
        # MOD necessária = Horas ocupadas na máquina / Horas mensais por operador
        mod_nec = round(s_ocup / horas_mes_operador, 2) if horas_mes_operador > 0 else 0.0
        mod_saldo = round(mod_disp - mod_nec, 2)
        pct_mod = round((mod_nec / mod_disp) * 100, 1) if mod_disp > 0 else 0.0
        status_mod = _determinar_status(pct_mod)
        tipo_gargalo = _determinar_tipo_gargalo(s_pct, pct_mod)

        setores_consolidados.append(
            CargaSetorItem(
                setor_nome=nome_setor,
                operacao_codigo=op_cod,
                horas_disponiveis=s_disp,
                horas_ocupadas=s_ocup,
                percentual_ocupacao=s_pct,
                status_capacidade=_determinar_status(s_pct),
                # Campos MOD
                mod_disponivel=mod_disp,
                horas_mod_disponivel=horas_mod_disp,
                mod_necessaria=mod_nec,
                mod_saldo=mod_saldo,
                percentual_ocupacao_mod=pct_mod,
                status_mod=status_mod,
                tipo_gargalo=tipo_gargalo,
                maquinas=maqs_setor,
            )
        )

    pct_total = round((total_ocup / total_disp) * 100, 1) if total_disp > 0 else 0.0

    # Totais consolidados de MOD da fábrica
    total_mod_disp = round(sum(s.mod_disponivel for s in setores_consolidados), 2)
    total_mod_nec = round(sum(s.mod_necessaria for s in setores_consolidados), 2)
    saldo_mod_tot = round(total_mod_disp - total_mod_nec, 2)
    pct_mod_tot = round((total_mod_nec / total_mod_disp) * 100, 1) if total_mod_disp > 0 else 0.0
    horas_mod_disp_tot = round(sum(s.horas_mod_disponivel for s in setores_consolidados), 2)
    setores_sobrec_mod = sum(1 for s in setores_consolidados if s.status_mod == "sobrecarga")

    return CargaMaquinaDashboardResponse(
        dias_uteis=dias_uteis,
        horas_dia_padrao=horas_dia_padrao,
        horas_dia_operador=8.35,
        horas_disponiveis_total=round(total_disp, 2),
        horas_ocupadas_total=round(total_ocup, 2),
        saldo_horas_total=round(total_disp - total_ocup, 2),
        percentual_ocupacao_total=pct_total,
        total_maquinas=len(maquinas),
        maquinas_sobrecarregadas=qtd_sobrecarga,
        maquinas_atencao=qtd_atencao,
        maquinas_normais=qtd_normal,
        # Indicadores Globais de MOD
        total_mod_disponivel=total_mod_disp,
        total_mod_necessaria=total_mod_nec,
        saldo_mod_total=saldo_mod_tot,
        percentual_ocupacao_mod_total=pct_mod_tot,
        horas_mod_disponiveis_total=horas_mod_disp_tot,
        setores_sobrecarregados_mod=setores_sobrec_mod,
        setores=setores_consolidados,
    )


def listar_setores_mod(db: Session) -> List[SetorMOD]:
    """Retorna a lista de setores com parametrização de mão de obra direta."""
    return db.query(SetorMOD).order_by(SetorMOD.id).all()


def atualizar_setores_mod(db: Session, setores_updates: List[SetorMODUpdate]) -> List[SetorMOD]:
    """Atualiza a quantidade de operadores e jornadas de cada setor."""
    op_nomes = {op["codigo"]: op["nome"] for op in OPERACOES_FABRICA}
    for update in setores_updates:
        item = db.query(SetorMOD).filter(SetorMOD.operacao_codigo == update.operacao_codigo).first()
        if item:
            item.quantidade_operadores = update.quantidade_operadores
            if update.horas_dia_operador is not None:
                item.horas_dia_operador = update.horas_dia_operador
            if update.observacoes is not None:
                item.observacoes = update.observacoes
        else:
            db.add(SetorMOD(
                operacao_codigo=update.operacao_codigo,
                setor_nome=op_nomes.get(update.operacao_codigo, update.operacao_codigo),
                quantidade_operadores=update.quantidade_operadores,
                horas_dia_operador=update.horas_dia_operador or 8.35,
                observacoes=update.observacoes,
            ))
    db.commit()
    return db.query(SetorMOD).order_by(SetorMOD.id).all()

