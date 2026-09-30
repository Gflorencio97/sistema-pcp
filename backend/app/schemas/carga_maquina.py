from pydantic import BaseModel, Field
from typing import List, Optional


class CargaMaquinaItem(BaseModel):
    maquina_id: int
    codigo: str
    nome: str
    setor: Optional[str] = None
    operacao_codigo: Optional[str] = None
    horas_por_dia: float
    horas_disponiveis: float
    horas_ocupadas: float
    saldo_horas: float
    percentual_ocupacao: float
    status_capacidade: str  # "normal", "atencao", "sobrecarga"
    qtd_ordens: int


class CargaSetorItem(BaseModel):
    setor_nome: str
    operacao_codigo: Optional[str] = None
    horas_disponiveis: float
    horas_ocupadas: float
    percentual_ocupacao: float
    status_capacidade: str
    maquinas: List[CargaMaquinaItem]


class CargaMaquinaDashboardResponse(BaseModel):
    dias_uteis: int
    horas_dia_padrao: float
    horas_disponiveis_total: float
    horas_ocupadas_total: float
    saldo_horas_total: float
    percentual_ocupacao_total: float
    total_maquinas: int
    maquinas_sobrecarregadas: int
    maquinas_atencao: int
    maquinas_normais: int
    setores: List[CargaSetorItem]


# Para simular a entrada de novos pedidos na capacidade
class ItemSimulacao(BaseModel):
    produto_id: int
    quantidade: float = Field(..., gt=0)


class SimulacaoCargaRequest(BaseModel):
    dias_uteis: Optional[int] = 22
    horas_dia: Optional[float] = 17.15
    pedidos: List[ItemSimulacao]
