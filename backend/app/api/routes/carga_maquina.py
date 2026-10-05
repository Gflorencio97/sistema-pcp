from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from app.core.database import get_db
from app.schemas.carga_maquina import (
    CargaMaquinaDashboardResponse,
    SimulacaoCargaRequest,
    SetorMODResponse,
    SetorMODUpdate,
    SetorMODListUpdate,
)
from app.services import carga_maquina_service

router = APIRouter(prefix="/carga-maquina", tags=["Carga Máquina"])


@router.get("/resumo", response_model=CargaMaquinaDashboardResponse)
def obter_resumo_carga_maquina(
    dias_uteis: int = Query(22, ge=1, le=31, description="Dias úteis no mês trabalhado"),
    horas_dia: float = Query(17.15, ge=1, le=24, description="Horas disponíveis por dia por máquina"),
    db: Session = Depends(get_db),
):
    """
    Retorna a capacidade vs ocupação de todas as máquinas da fábrica no mês,
    incluindo o balanço completo de Homem x Máquina (Mão de Obra Direta - MOD).
    """
    return carga_maquina_service.calcular_dashboard_carga_maquina(
        db, dias_uteis=dias_uteis, horas_dia_padrao=horas_dia
    )


@router.post("/simular", response_model=CargaMaquinaDashboardResponse)
def simular_impacto_carga(
    req: SimulacaoCargaRequest,
    db: Session = Depends(get_db),
):
    """
    Simula o impacto de novos pedidos na carga de cada máquina da fábrica e na mão de obra necessária.
    """
    return carga_maquina_service.calcular_dashboard_carga_maquina(
        db,
        dias_uteis=req.dias_uteis or 22,
        horas_dia_padrao=req.horas_dia or 17.15,
        pedidos_simulados=req.pedidos,
    )


@router.get("/mod", response_model=List[SetorMODResponse])
def listar_parametrizacao_mod(db: Session = Depends(get_db)):
    """
    Lista a distribuição de operadores (Mão de Obra Direta) cadastrada por setor industrial.
    """
    return carga_maquina_service.listar_setores_mod(db)


@router.put("/mod", response_model=List[SetorMODResponse])
def atualizar_parametrizacao_mod(
    payload: SetorMODListUpdate,
    db: Session = Depends(get_db),
):
    """
    Atualiza em lote a quantidade de operadores disponíveis e jornada de cada setor.
    """
    return carga_maquina_service.atualizar_setores_mod(db, payload.setores)


@router.put("/mod/{operacao_codigo}", response_model=List[SetorMODResponse])
def atualizar_operadores_setor(
    operacao_codigo: str,
    payload: SetorMODUpdate,
    db: Session = Depends(get_db),
):
    """
    Atualiza pontualmente a quantidade de operadores de um setor específico.
    """
    payload.operacao_codigo = operacao_codigo
    return carga_maquina_service.atualizar_setores_mod(db, [payload])

