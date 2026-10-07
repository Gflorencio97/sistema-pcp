import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.core.database import Base, engine
from app.api.routes import maquinas, produtos, ordens, roteiro, carga_maquina

# Cria as tabelas no banco (em produção use Alembic)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PCP - Planejamento e Controle da Produção",
    description="API para gestão de produção industrial: máquinas, produtos e programação.",
    version="1.0.0",
)

# CORS - permite qualquer computador na rede local acessar a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_origin_regex=r"^https?://.*",
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registra os routers da API
app.include_router(maquinas.router, prefix="/api/v1")
app.include_router(produtos.router, prefix="/api/v1")
app.include_router(ordens.router, prefix="/api/v1")
app.include_router(roteiro.router, prefix="/api/v1")
app.include_router(carga_maquina.router, prefix="/api/v1")


@app.get("/api/v1/health", tags=["Health"])
def health():
    return {"status": "ok"}


# Servir o Frontend React compilado (frontend/dist) na mesma porta
dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))

if os.path.exists(dist_path):
    assets_path = os.path.join(dist_path, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Rotas da API e docs não são interceptadas pelo SPA
        if full_path.startswith("api/") or full_path in ["docs", "redoc", "openapi.json"]:
            return None
        file_path = os.path.join(dist_path, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(dist_path, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"status": "ok", "message": "PCP API rodando 🚀"}
else:
    @app.get("/", tags=["Health"])
    def root():
        return {"status": "ok", "message": "PCP API rodando 🚀 (Frontend dist não encontrado)"}

