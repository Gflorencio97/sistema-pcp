import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.core.database import Base, engine
from app.api.routes import maquinas, produtos, ordens, roteiro, carga_maquina

# Cria as tabelas no banco (em produção use Alembic)
Base.metadata.create_all(bind=engine)


def _backup_antes_de_migrar():
    """Antes da migracao que recalcula datas e remove a Linha de Lavagem, guarda uma copia do banco
    (backend/pcp_antes_migracao_AAAAMMDD_HHMMSS.db). So acontece quando ha migracao pendente."""
    import os
    import shutil
    import sqlite3
    from datetime import datetime

    if engine.dialect.name != "sqlite":
        return
    caminho = engine.url.database
    if not caminho or not os.path.exists(caminho):
        return
    con = sqlite3.connect(f"file:{caminho}?mode=ro", uri=True)
    try:
        cols = [r[1] for r in con.execute("PRAGMA table_info('ordens_producao')").fetchall()]
        tem_lavagem = con.execute("SELECT COUNT(*) FROM maquinas WHERE codigo = 'LAV-01'").fetchone()[0]
    finally:
        con.close()
    if "fim_manual" in cols and not tem_lavagem:
        return
    destino = os.path.join(
        os.path.dirname(caminho),
        f"pcp_antes_migracao_{datetime.now():%Y%m%d_%H%M%S}.db",
    )
    shutil.copyfile(caminho, destino)
    print(f"[migracao] copia de seguranca do banco: {destino}")


_backup_antes_de_migrar()


def _permitir_numero_op_repetido():
    """Bancos antigos tem indice UNICO em ordens_producao.numero.
    Troca por indice comum (idempotente, sem perder dados)."""
    from sqlalchemy import text
    with engine.begin() as conn:
        if engine.dialect.name != "sqlite":
            return
        idx = conn.execute(text("PRAGMA index_list('ordens_producao')")).fetchall()
        # colunas: seq, name, unique, origin, partial
        if any(r[1] == "ix_ordens_producao_numero" and r[2] == 1 for r in idx):
            conn.execute(text("DROP INDEX ix_ordens_producao_numero"))
            conn.execute(text("CREATE INDEX ix_ordens_producao_numero ON ordens_producao (numero)"))


_permitir_numero_op_repetido()


def _adicionar_coluna_horas_extras():
    from sqlalchemy import text
    with engine.begin() as conn:
        if engine.dialect.name != "sqlite":
            return
        cols = [r[1] for r in conn.execute(text("PRAGMA table_info('maquinas')")).fetchall()]
        if "horas_extras_dia" not in cols:
            conn.execute(text("ALTER TABLE maquinas ADD COLUMN horas_extras_dia FLOAT DEFAULT 0"))


_adicionar_coluna_horas_extras()


def _adicionar_coluna_fim_manual():
    """OPs em aberto passam a ter o fim calculado por pecas/hora e turnos (fim_manual = 0).
    OPs concluidas ou canceladas mantem as datas (fim_manual = 1)."""
    from sqlalchemy import text
    with engine.begin() as conn:
        if engine.dialect.name != "sqlite":
            return
        cols = [r[1] for r in conn.execute(text("PRAGMA table_info('ordens_producao')")).fetchall()]
        if "fim_manual" not in cols:
            conn.execute(text("ALTER TABLE ordens_producao ADD COLUMN fim_manual BOOLEAN DEFAULT 0"))
            conn.execute(text(
                "UPDATE ordens_producao SET fim_manual = "
                "CASE WHEN status IN ('concluida', 'cancelada') THEN 1 ELSE 0 END"
            ))


_adicionar_coluna_fim_manual()


def _migrar_lavagem_para_inspecao():
    """A Linha de Lavagem deixa de existir: tudo passa para a Linha de Inspecao.
    Idempotente: se a Lavagem ja nao existe, so garante os nomes."""
    from sqlalchemy import text
    with engine.begin() as conn:
        lav = conn.execute(text("select id from maquinas where codigo = 'LAV-01'")).fetchone()
        insp = conn.execute(text("select id from maquinas where codigo = 'INSP-01'")).fetchone()
        if lav and insp:
            for tabela in ("roteiro_produto", "ordens_producao", "etapas_ordem"):
                conn.execute(
                    text(f"update {tabela} set maquina_id = :novo where maquina_id = :velho"),
                    {"novo": insp[0], "velho": lav[0]},
                )
            conn.execute(text("delete from maquinas where id = :velho"), {"velho": lav[0]})
        for tabela, coluna in (("roteiro_produto", "operacao_nome"), ("etapas_ordem", "operacao_nome"),
                               ("setores_mod", "setor_nome")):
            conn.execute(
                text(f"update {tabela} set {coluna} = 'Inspeção' "
                     f"where operacao_codigo = 'LAV_INSP' and {coluna} <> 'Inspeção'")
            )


_migrar_lavagem_para_inspecao()


def _preencher_etapas():
    from app.core.database import SessionLocal
    from app.services import etapa_service
    db = SessionLocal()
    try:
        etapa_service.preencher_etapas_existentes(db)
    finally:
        db.close()


_preencher_etapas()

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

