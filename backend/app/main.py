from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import Base, engine
from app.api.routes import maquinas, produtos, ordens, roteiro, carga_maquina

# Cria as tabelas no banco (em produção use Alembic)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PCP - Planejamento e Controle da Produção",
    description="API para gestão de produção industrial: máquinas, produtos e programação.",
    version="1.0.0",
)

# CORS - permite o frontend React acessar a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registra os routers
app.include_router(maquinas.router, prefix="/api/v1")
app.include_router(produtos.router, prefix="/api/v1")
app.include_router(ordens.router, prefix="/api/v1")
app.include_router(roteiro.router, prefix="/api/v1")
app.include_router(carga_maquina.router, prefix="/api/v1")



@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "PCP API rodando 🚀"}


@app.get("/api/v1/health", tags=["Health"])
def health():
    return {"status": "ok"}
