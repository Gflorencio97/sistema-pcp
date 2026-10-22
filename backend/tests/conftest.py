"""Configuracao dos testes: banco temporario e variaveis de ambiente definidos ANTES de importar o app."""
import os
import sys
import tempfile
import uuid
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

_TMP = tempfile.mkdtemp(prefix="pcp_teste_")
os.environ["DATABASE_URL"] = "sqlite:///" + (Path(_TMP) / "teste.db").as_posix()
os.environ["SECRET_KEY"] = "chave-de-teste-" + "x" * 40
os.environ["PCP_ADMIN_SENHA"] = "AdminTeste123"
os.environ["PCP_AMBIENTE"] = "desenvolvimento"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.database import SessionLocal  # noqa: E402
from app.core.security import hash_senha, tentativas_login  # noqa: E402
from app.main import app  # noqa: E402
from app.models.models import Usuario  # noqa: E402

SENHA_PADRAO = "Senha12345"


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _limpar_bloqueios():
    tentativas_login.limpar()
    yield
    tentativas_login.limpar()


def criar_usuario(perfil: str, senha: str = SENHA_PADRAO, ativo: bool = True, deve_trocar: bool = False):
    """Cria um usuario direto no banco. Devolve (login, senha, id)."""
    login = f"{perfil[:3]}_{uuid.uuid4().hex[:8]}"
    db = SessionLocal()
    try:
        u = Usuario(
            nome=f"Teste {perfil}", login=login, senha_hash=hash_senha(senha),
            perfil=perfil, ativo=ativo, deve_trocar_senha=deve_trocar,
        )
        db.add(u)
        db.commit()
        db.refresh(u)
        return login, senha, u.id
    finally:
        db.close()


def entrar(client, login: str, senha: str = SENHA_PADRAO):
    r = client.post("/api/v1/auth/login", json={"login": login, "senha": senha})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def admin(client):
    login, _, uid = criar_usuario("admin")
    return {"headers": entrar(client, login), "login": login, "id": uid}


@pytest.fixture()
def editor(client):
    login, _, uid = criar_usuario("editor")
    return {"headers": entrar(client, login), "login": login, "id": uid}


@pytest.fixture()
def visualizador(client):
    login, _, uid = criar_usuario("visualizador")
    return {"headers": entrar(client, login), "login": login, "id": uid}


def codigo_unico(prefixo: str = "T") -> str:
    return f"{prefixo}-{uuid.uuid4().hex[:8]}"
