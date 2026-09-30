from sqlalchemy.orm import Session, joinedload
from typing import Dict, List, Optional
from collections import defaultdict

from app.models.models import Maquina, Produto, OrdemProducao, RoteiroProduto, StatusMaquina, StatusOrdem, OPERACOES_FABRICA
from app.schemas.carga_maquina import (
    CargaMaquinaItem, CargaSetorItem, CargaMaquinaDashboardResponse,
    ItemSimulacao
)


def _determinar_status(percentual: float) -> str:
    if percentual > 100.0:
        return "sobrecarga"
    elif percentual >= 80.0:
        return "atencao"
    return "normal"


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

    # 2. Mapa de horas ocupadas por máquina
    horas_ocupadas_map: Dict[int, float] = defaultdict(float)
    ordens_count_map: Dict[int, int] = defaultdict(int)

    # 3. Processar ordens em andamento e planejadas no sistema
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
            # Estimativa básica se não houver taxa de roteiro (ex: 20 pcs/h)
            horas_ocupadas_map[op.maquina_id] += (qtd_restante / 20.0)
            ordens_count_map[op.maquina_id] += 1

    # 4. Somar pedidos simulados (se houver)
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

    # 5. Mapeamento de nomes de operações
    op_nomes = {op["codigo"]: op["nome"] for op in OPERACOES_FABRICA}

    # 6. Agrupamento por setor / operação
    setores_map: Dict[str, List[CargaMaquinaItem]] = defaultdict(list)

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

        setor_chave = maq.setor or op_nomes.get(maq.operacao_codigo or "", "Outros Setores")
        setores_map[setor_chave].append(item_maq)

    # 7. Montar lista de setores consolidados
    setores_consolidados: List[CargaSetorItem] = []
    for nome_setor, maqs_setor in setores_map.items():
        s_disp = round(sum(m.horas_disponiveis for m in maqs_setor), 2)
        s_ocup = round(sum(m.horas_ocupadas for m in maqs_setor), 2)
        s_pct = round((s_ocup / s_disp) * 100, 1) if s_disp > 0 else 0.0
        op_cod = maqs_setor[0].operacao_codigo if maqs_setor else None

        setores_consolidados.append(
            CargaSetorItem(
                setor_nome=nome_setor,
                operacao_codigo=op_cod,
                horas_disponiveis=s_disp,
                horas_ocupadas=s_ocup,
                percentual_ocupacao=s_pct,
                status_capacidade=_determinar_status(s_pct),
                maquinas=maqs_setor,
            )
        )

    pct_total = round((total_ocup / total_disp) * 100, 1) if total_disp > 0 else 0.0

    return CargaMaquinaDashboardResponse(
        dias_uteis=dias_uteis,
        horas_dia_padrao=horas_dia_padrao,
        horas_disponiveis_total=round(total_disp, 2),
        horas_ocupadas_total=round(total_ocup, 2),
        saldo_horas_total=round(total_disp - total_ocup, 2),
        percentual_ocupacao_total=pct_total,
        total_maquinas=len(maquinas),
        maquinas_sobrecarregadas=qtd_sobrecarga,
        maquinas_atencao=qtd_atencao,
        maquinas_normais=qtd_normal,
        setores=setores_consolidados,
    )
