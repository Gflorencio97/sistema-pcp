from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # SQLite por padrão (sem necessidade de instalar nada)
    # Para produção: postgresql://usuario:senha@localhost:5432/pcp_db
    DATABASE_URL: str = "sqlite:///./pcp.db"
    SECRET_KEY: str = "sua-chave-secreta-aqui-troque-em-producao"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    class Config:
        env_file = ".env"


settings = Settings()
