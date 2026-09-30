from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.models import StatusMaquina


# --- Maquina Schemas ---

class MaquinaBase(BaseModel):
    codigo: str = Field(..., max_length=50, description="Código único da máquina/linha")
    nome: str = Field(..., max_length=150, description="Nome da máquina/linha")
    descricao: Optional[str] = None
    setor: Optional[str] = Field(None, max_length=100)
    operacao_codigo: Optional[str] = Field(None, max_length=50, description="Operação da fábrica que esta máquina executa")
    horas_por_dia: Optional[float] = Field(default=17.15, ge=0, description="Horas produtivas disponíveis por dia")
    capacidade_hora: Optional[float] = Field(None, ge=0)
    status: StatusMaquina = StatusMaquina.ATIVA
    turno_manha: bool = True
    turno_tarde: bool = True
    turno_noite: bool = False


class MaquinaCreate(MaquinaBase):
    pass


class MaquinaUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    setor: Optional[str] = None
    operacao_codigo: Optional[str] = None
    horas_por_dia: Optional[float] = None
    capacidade_hora: Optional[float] = None
    status: Optional[StatusMaquina] = None
    turno_manha: Optional[bool] = None
    turno_tarde: Optional[bool] = None
    turno_noite: Optional[bool] = None


class MaquinaResponse(MaquinaBase):
    id: int
    criado_em: Optional[datetime] = None
    atualizado_em: Optional[datetime] = None


    class Config:
        from_attributes = True
