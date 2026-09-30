from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class RoteiroItemBase(BaseModel):
    operacao_codigo: str
    operacao_nome: str
    ordem: int
    pcs_hora: Optional[float] = Field(None, ge=0, description="Peças por hora (0 ou null = operação não aplicável)")
    maquina_id: Optional[int] = Field(None, description="ID da máquina/linha padrão")
    ativo: bool = True


class RoteiroItemCreate(RoteiroItemBase):
    pass


class RoteiroItemUpdate(BaseModel):
    pcs_hora: Optional[float] = None
    maquina_id: Optional[int] = None
    ativo: Optional[bool] = None


class RoteiroSalvarItem(BaseModel):
    operacao_codigo: str
    pcs_hora: Optional[float] = None
    maquina_id: Optional[int] = None
    ativo: bool = True


class RoteiroSalvarRequest(BaseModel):
    itens: List[RoteiroSalvarItem]


class RoteiroItemResponse(RoteiroItemBase):
    id: int
    produto_id: int
    horas_por_peca: Optional[float] = None   # calculado: 1 / pcs_hora
    maquina_nome: Optional[str] = None
    maquina_codigo: Optional[str] = None
    maquina_horas_por_dia: Optional[float] = None
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True


# Schema para o cálculo de horas de um pedido
class CalculoHorasRequest(BaseModel):
    produto_id: int
    quantidade: float = Field(..., gt=0, description="Quantidade de peças do pedido")


class CalculoOperacao(BaseModel):
    operacao_codigo: str
    operacao_nome: str
    ordem: int
    pcs_hora: Optional[float]
    horas_necessarias: Optional[float]      # quantidade / pcs_hora
    maquina_id: Optional[int] = None
    maquina_nome: Optional[str] = None
    maquina_horas_por_dia: Optional[float] = None
    dias_necessarios: Optional[float] = None # horas_necessarias / horas_por_dia
    disponivel: bool = True                 # para verificação de capacidade


class CalculoHorasResponse(BaseModel):
    produto_id: int
    produto_nome: str
    quantidade: float
    operacoes: List[CalculoOperacao]
    total_horas: float                      # soma de todas as operações
