from datetime import datetime
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
    # Indicadores de Mão de Obra Direta (MOD / Homem x Máquina)
    mod_disponivel: float = 0.0
    horas_mod_disponivel: float = 0.0
    mod_necessaria: float = 0.0
    mod_saldo: float = 0.0
    percentual_ocupacao_mod: float = 0.0
    status_mod: str = "normal"  # "normal", "atencao", "sobrecarga"
    tipo_gargalo: str = "equilibrado"  # "equilibrado", "gargalo_maquina", "gargalo_mao_de_obra", "critico_total", "atencao"
    maquinas: List[CargaMaquinaItem]


class CargaMaquinaDashboardResponse(BaseModel):
    dias_uteis: int
    horas_dia_padrao: float
    horas_dia_operador: float = 8.35
    horas_disponiveis_total: float
    horas_ocupadas_total: float
    saldo_horas_total: float
    percentual_ocupacao_total: float
    total_maquinas: int
    maquinas_sobrecarregadas: int
    maquinas_atencao: int
    maquinas_normais: int
    # Totais consolidados de MOD (Homem x Máquina)
    total_mod_disponivel: float = 0.0
    total_mod_necessaria: float = 0.0
    saldo_mod_total: float = 0.0
    percentual_ocupacao_mod_total: float = 0.0
    horas_mod_disponiveis_total: float = 0.0
    setores_sobrecarregados_mod: int = 0
    setores: List[CargaSetorItem]


# Para simular a entrada de novos pedidos na capacidade
class ItemSimulacao(BaseModel):
    produto_id: int
    quantidade: float = Field(..., gt=0)


class SimulacaoCargaRequest(BaseModel):
    dias_uteis: Optional[int] = 22
    horas_dia: Optional[float] = 17.15
    pedidos: List[ItemSimulacao]


# Schemas para Gestão de Mão de Obra Direta (MOD)
class SetorMODResponse(BaseModel):
    id: int
    operacao_codigo: str
    setor_nome: str
    quantidade_operadores: float
    horas_dia_operador: float
    observacoes: Optional[str] = None
    atualizado_em: Optional[datetime] = None

    class Config:
        from_attributes = True


class SetorMODUpdate(BaseModel):
    operacao_codigo: str
    quantidade_operadores: float = Field(..., ge=0)
    horas_dia_operador: Optional[float] = Field(8.35, ge=1, le=24)
    observacoes: Optional[str] = None


class SetorMODListUpdate(BaseModel):
    setores: List[SetorMODUpdate]

