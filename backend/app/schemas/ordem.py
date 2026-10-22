from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.models import StatusOrdem, PrioridadeOrdem
from app.schemas.produto import ProdutoResponse
from app.schemas.maquina import MaquinaResponse


# --- OrdemProducao Schemas ---

class OrdemProducaoBase(BaseModel):
    numero: str = Field(..., max_length=50)
    produto_id: int
    maquina_id: Optional[int] = None
    quantidade_planejada: float = Field(..., gt=0, le=10_000_000)
    prioridade: PrioridadeOrdem = PrioridadeOrdem.NORMAL
    data_inicio_planejada: Optional[datetime] = None
    data_fim_planejada: Optional[datetime] = None
    observacoes: Optional[str] = None
    fim_manual: bool = False


class OrdemProducaoCreate(OrdemProducaoBase):
    pass


class OrdemProducaoUpdate(BaseModel):
    maquina_id: Optional[int] = None
    quantidade_planejada: Optional[float] = Field(None, gt=0, le=10_000_000)
    quantidade_produzida: Optional[float] = Field(None, ge=0, le=10_000_000)
    status: Optional[StatusOrdem] = None
    prioridade: Optional[PrioridadeOrdem] = None
    data_inicio_planejada: Optional[datetime] = None
    data_fim_planejada: Optional[datetime] = None
    data_inicio_real: Optional[datetime] = None
    data_fim_real: Optional[datetime] = None
    observacoes: Optional[str] = None
    fim_manual: Optional[bool] = None


class OrdemProducaoResponse(OrdemProducaoBase):
    id: int
    status: StatusOrdem
    quantidade_produzida: float
    data_inicio_real: Optional[datetime] = None
    data_fim_real: Optional[datetime] = None
    criado_em: datetime
    atualizado_em: datetime
    produto: Optional[ProdutoResponse] = None
    maquina: Optional[MaquinaResponse] = None

    class Config:
        from_attributes = True


# Schema simplificado para o Gantt
class OrdemGantt(BaseModel):
    id: int
    numero: str
    produto_nome: str
    produto_codigo: Optional[str] = None
    produto_codigo_fundido: Optional[str] = None
    maquina_nome: Optional[str] = None
    maquina_codigo: Optional[str] = None
    maquina_id: Optional[int] = None
    operacao_codigo: Optional[str] = None
    status: StatusOrdem
    prioridade: PrioridadeOrdem
    data_inicio_planejada: Optional[datetime] = None
    data_fim_planejada: Optional[datetime] = None
    quantidade_planejada: float
    quantidade_produzida: float
    percentual_conclusao: float = 0.0
    observacoes: Optional[str] = None
    etapa_id: Optional[int] = None
    etapa_seq: Optional[int] = None
    etapa_total: Optional[int] = None
    etapa_nome: Optional[str] = None
    ordem_maquina_id: Optional[int] = None
    ordem_data_inicio: Optional[datetime] = None
    ordem_data_fim: Optional[datetime] = None
    ordem_fim_calculado: Optional[datetime] = None
    ordem_fim_manual: Optional[bool] = None
    falta_capacidade_dias: Optional[int] = None

    class Config:
        from_attributes = True
