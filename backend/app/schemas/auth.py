import json
import re
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field, field_validator

PERFIS = ("admin", "editor", "visualizador")
_LOGIN_OK = re.compile(r"^[a-z0-9._-]{3,50}$")


class LoginRequest(BaseModel):
    login: str = Field(..., min_length=1, max_length=50)
    senha: str = Field(..., min_length=1, max_length=128)


class UsuarioResponse(BaseModel):
    id: int
    nome: str
    login: str
    perfil: str
    ativo: bool
    deve_trocar_senha: bool
    criado_em: Optional[datetime] = None
    ultimo_acesso: Optional[datetime] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    usuario: UsuarioResponse


class TrocarSenhaRequest(BaseModel):
    senha_atual: str = Field(..., min_length=1, max_length=128)
    nova_senha: str = Field(..., min_length=1, max_length=128)


class UsuarioCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=150)
    login: str = Field(..., max_length=50)
    perfil: str = "visualizador"
    # Se nao for informada, o sistema gera uma senha provisoria e devolve uma unica vez
    senha: Optional[str] = Field(None, max_length=128)

    @field_validator("login")
    @classmethod
    def _login(cls, v: str) -> str:
        v = v.strip().lower()
        if not _LOGIN_OK.match(v):
            raise ValueError("Login: 3 a 50 caracteres, só letras minúsculas, números, ponto, hífen e sublinhado.")
        return v

    @field_validator("perfil")
    @classmethod
    def _perfil(cls, v: str) -> str:
        if v not in PERFIS:
            raise ValueError("Perfil inválido. Use: admin, editor ou visualizador.")
        return v


class UsuarioUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=2, max_length=150)
    perfil: Optional[str] = None
    ativo: Optional[bool] = None

    @field_validator("perfil")
    @classmethod
    def _perfil(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in PERFIS:
            raise ValueError("Perfil inválido. Use: admin, editor ou visualizador.")
        return v


class UsuarioComSenha(UsuarioResponse):
    """Devolvido apenas na criacao e na redefinicao: a senha provisoria aparece uma unica vez."""
    senha_temporaria: Optional[str] = None


class AuditoriaResponse(BaseModel):
    id: int
    usuario_id: Optional[int] = None
    usuario_login: Optional[str] = None
    acao: str
    entidade: Optional[str] = None
    entidade_id: Optional[str] = None
    dados_antes: Optional[Dict[str, Any]] = None
    dados_depois: Optional[Dict[str, Any]] = None
    ip: Optional[str] = None
    data_hora: Optional[datetime] = None

    @field_validator("dados_antes", "dados_depois", mode="before")
    @classmethod
    def _json(cls, v: Any) -> Any:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except ValueError:
                return {"texto": v}
        return v

    class Config:
        from_attributes = True
