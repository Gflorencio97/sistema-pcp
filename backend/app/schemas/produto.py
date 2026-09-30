from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# --- Produto Schemas ---

class ProdutoBase(BaseModel):
    codigo: str = Field(..., max_length=50)
    nome: str = Field(..., max_length=200)
    descricao: Optional[str] = None
    codigo_fundido: Optional[str] = Field(None, max_length=50, description="Código da matéria-prima fundida")
    unidade_medida: str = Field(default="UN", max_length=20)
    ativo: bool = True


class ProdutoCreate(ProdutoBase):
    pass


class ProdutoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    codigo_fundido: Optional[str] = None
    unidade_medida: Optional[str] = None
    ativo: Optional[bool] = None


class ProdutoResponse(ProdutoBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True
