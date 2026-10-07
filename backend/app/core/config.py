import os
from pydantic_settings import BaseSettings

_CORE_DIR = os.path.dirname(os.path.abspath(__file__))
_APP_DIR = os.path.dirname(_CORE_DIR)
_BACKEND_DIR = os.path.dirname(_APP_DIR)
_DEFAULT_DB_FILE = os.path.abspath(os.path.join(_BACKEND_DIR, "pcp.db")).replace("\\", "/")
_DEFAULT_DB_URL = f"sqlite:///{_DEFAULT_DB_FILE}"


class Settings(BaseSettings):
    # SQLite por padrão apontando diretamente para backend/pcp.db
    # Para produção/Docker: use a variável DATABASE_URL
    DATABASE_URL: str = os.getenv("DATABASE_URL", _DEFAULT_DB_URL)
    SECRET_KEY: str = "sua-chave-secreta-aqui-troque-em-producao"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    class Config:
        env_file = ".env"


settings = Settings()
