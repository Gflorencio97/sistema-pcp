"""Configuracao do sistema.

Ordem de leitura de cada valor: variavel de ambiente > arquivo backend/.env > padrao.
O arquivo backend/.env NAO e versionado.

Variaveis principais:
  PCP_AMBIENTE        'producao' desliga /docs e restringe o CORS (padrao: desenvolvimento)
  SECRET_KEY          chave do JWT (se faltar, e gerada aleatoriamente e gravada em backend/.env)
  PCP_ADMIN_SENHA     senha inicial do usuario admin (se faltar, e gerada e escrita uma unica vez no log)
  DATABASE_URL        banco (padrao: SQLite em backend/pcp.db)
  ACCESS_TOKEN_EXPIRE_MINUTES  validade do login (padrao 480 = 8 h)
"""
import os
import secrets
from pathlib import Path
from typing import List

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = _BACKEND_DIR / ".env"
_DEFAULT_DB_FILE = (_BACKEND_DIR / "pcp.db").as_posix()
_DEFAULT_DB_URL = f"sqlite:///{_DEFAULT_DB_FILE}"

# Valores de exemplo que nunca podem ser usados como chave de verdade
_CHAVES_INSEGURAS = {
    "",
    "sua-chave-secreta-aqui-troque-em-producao",
    "changeme",
    "secret",
}


def _chave_valida(valor: str | None) -> bool:
    return bool(valor) and valor not in _CHAVES_INSEGURAS and len(valor) >= 32


def _ler_chave_do_arquivo() -> str | None:
    if not ENV_FILE.exists():
        return None
    ultima = None
    for linha in ENV_FILE.read_text(encoding="utf-8").splitlines():
        if linha.strip().startswith("SECRET_KEY="):
            valor = linha.split("=", 1)[1].strip().strip('"').strip("'")
            if _chave_valida(valor):
                ultima = valor
    return ultima


def garantir_secret_key() -> str:
    """Devolve uma SECRET_KEY segura: ambiente > backend/.env > gera e grava em backend/.env."""
    do_ambiente = os.getenv("SECRET_KEY")
    if _chave_valida(do_ambiente):
        return do_ambiente  # type: ignore[return-value]
    do_arquivo = _ler_chave_do_arquivo()
    if do_arquivo:
        return do_arquivo
    nova = secrets.token_urlsafe(48)
    existente = ENV_FILE.read_text(encoding="utf-8") if ENV_FILE.exists() else ""
    prefixo = "" if (not existente or existente.endswith("\n")) else "\n"
    with open(ENV_FILE, "a", encoding="utf-8") as f:
        f.write(f"{prefixo}SECRET_KEY={nova}\n")
    return nova


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(ENV_FILE), env_file_encoding="utf-8", extra="ignore")

    # --- banco ---
    DATABASE_URL: str = _DEFAULT_DB_URL

    # --- seguranca ---
    SECRET_KEY: str = Field(default_factory=garantir_secret_key)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    PCP_AMBIENTE: str = "desenvolvimento"
    PCP_ADMIN_SENHA: str | None = None

    # --- protecao do login ---
    LOGIN_MAX_TENTATIVAS: int = 5
    LOGIN_BLOQUEIO_MINUTOS: int = 5

    # --- limites e CORS ---
    MAX_BODY_BYTES: int = 1_000_000
    CORS_ORIGENS_DEV: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    @model_validator(mode="after")
    def _chave_secreta_segura(self):
        # .env copiado do .env.example (placeholder) ou chave curta: troca por uma chave gerada
        if not _chave_valida(self.SECRET_KEY):
            self.SECRET_KEY = garantir_secret_key()
        return self

    @property
    def em_producao(self) -> bool:
        return self.PCP_AMBIENTE.strip().lower() in ("producao", "produção", "production", "prod")


settings = Settings()
