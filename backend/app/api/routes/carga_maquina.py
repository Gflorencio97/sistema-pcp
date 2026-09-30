from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.schemas.carga_maquina import CargaMaquinaDashboardResponse, SimulacaoCargaRequest
from app.services import carga_maquina_service

router = APIRouter(prefix="/carga-maquina", tags=["Carga Máquina"])


@router.get("/resumo", response_model=CargaMaquinaDashboardResponse)
def obter_resumo_carga_maquina(
    dias_uteis: int = Query(22, ge=1, le=31, description="Dias úteis no mês trabalhado"),
    horas_dia: float = Query(17.15, ge=1, le=24, description="Horas disponíveis por dia por máquina"),
    db: Session = Depends(get_db),
):
    """
    Retorna a capacidade vs ocupação de todas as máquinas da fábrica no mês.
    Calcula horas disponíveis, horas de produção e percentual de ocupação.
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
    Simula o impacto de novos pedidos na carga de cada máquina da fábrica.
    """
    return carga_maquina_service.calcular_dashboard_carga_maquina(
        db,
        dias_uteis=req.dias_uteis or 22,
        horas_dia_padrao=req.horas_dia or 17.15,
        pedidos_simulados=req.pedidos,
    )
