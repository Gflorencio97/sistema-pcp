import json
import subprocess
import sys
import textwrap
from pathlib import Path

import pytest

from conftest import SENHA_PADRAO, BACKEND, codigo_unico, criar_usuario, entrar


# ------------------------------------------------------------------ login
def test_login_correto(client):
    login, senha, _ = criar_usuario("editor")
    r = client.post("/api/v1/auth/login", json={"login": login, "senha": senha})
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["access_token"] and corpo["token_type"] == "bearer"
    assert corpo["usuario"]["login"] == login
    assert "senha" not in json.dumps(corpo["usuario"]).lower().replace("deve_trocar_senha", "")
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {corpo['access_token']}"}).json()["login"] == login


def test_login_errado_nao_revela_se_o_usuario_existe(client):
    login, _, _ = criar_usuario("editor")
    r1 = client.post("/api/v1/auth/login", json={"login": login, "senha": "senha-errada-1"})
    r2 = client.post("/api/v1/auth/login", json={"login": "usuario_que_nao_existe", "senha": "senha-errada-1"})
    assert r1.status_code == r2.status_code == 401
    assert r1.json()["detail"] == r2.json()["detail"]


def test_bloqueio_apos_5_tentativas_erradas(client):
    login, senha, _ = criar_usuario("editor")
    for _ in range(5):
        assert client.post("/api/v1/auth/login", json={"login": login, "senha": "errada123"}).status_code == 401
    r = client.post("/api/v1/auth/login", json={"login": login, "senha": senha})   # ate a senha certa e recusada
    assert r.status_code == 429
    assert int(r.headers["Retry-After"]) > 0
    outro, senha2, _ = criar_usuario("editor")                                     # outro usuario nao e afetado
    assert client.post("/api/v1/auth/login", json={"login": outro, "senha": senha2}).status_code == 200


def test_usuario_inativo_nao_entra(client):
    login, senha, _ = criar_usuario("editor", ativo=False)
    assert client.post("/api/v1/auth/login", json={"login": login, "senha": senha}).status_code == 401


def test_admin_inicial_precisa_trocar_a_senha(client):
    r = client.post("/api/v1/auth/login", json={"login": "admin", "senha": "AdminTeste123"})
    assert r.status_code == 200
    assert r.json()["usuario"]["deve_trocar_senha"] is True
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.get("/api/v1/produtos", headers=h).status_code == 403          # bloqueado ate trocar
    assert client.get("/api/v1/auth/me", headers=h).status_code == 200           # /me continua liberado


def test_trocar_senha(client):
    login, senha, _ = criar_usuario("editor", deve_trocar=True)
    h = entrar(client, login, senha)
    url = "/api/v1/auth/trocar-senha"
    assert client.post(url, headers=h, json={"senha_atual": "errada", "nova_senha": "NovaSenha123"}).status_code == 400
    assert client.post(url, headers=h, json={"senha_atual": senha, "nova_senha": "curta1"}).status_code == 400
    assert client.post(url, headers=h, json={"senha_atual": senha, "nova_senha": "somenteletras"}).status_code == 400
    r = client.post(url, headers=h, json={"senha_atual": senha, "nova_senha": "NovaSenha123"})
    assert r.status_code == 200
    novo = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.get("/api/v1/produtos", headers=novo).status_code == 200      # liberado
    assert client.get("/api/v1/produtos", headers=h).status_code == 401         # token antigo invalidado
    assert client.post("/api/v1/auth/login", json={"login": login, "senha": senha}).status_code == 401
    assert client.post("/api/v1/auth/login", json={"login": login, "senha": "NovaSenha123"}).status_code == 200


# ------------------------------------------------------- rotas protegidas e perfis
def test_rotas_sem_token_dao_401(client):
    for metodo, url in (("get", "/api/v1/produtos"), ("get", "/api/v1/ordens"), ("get", "/api/v1/maquinas"),
                        ("get", "/api/v1/carga-maquina/resumo"), ("get", "/api/v1/usuarios"),
                        ("get", "/api/v1/auditoria")):
        assert getattr(client, metodo)(url).status_code == 401, url
    assert client.post("/api/v1/produtos", json={"codigo": "X", "nome": "Y"}).status_code == 401
    assert client.delete("/api/v1/produtos/1").status_code == 401


def test_health_e_login_ficam_abertos(client):
    assert client.get("/api/v1/health").status_code == 200
    assert client.post("/api/v1/auth/login", json={"login": "x", "senha": "y"}).status_code == 401  # nao e 403


def test_token_invalido_ou_adulterado(client):
    assert client.get("/api/v1/produtos", headers={"Authorization": "Bearer lixo"}).status_code == 401
    assert client.get("/api/v1/produtos", headers={"Authorization": "Basic abc"}).status_code == 401


def test_visualizador_le_mas_nao_edita(client, visualizador):
    h = visualizador["headers"]
    assert client.get("/api/v1/produtos", headers=h).status_code == 200
    assert client.get("/api/v1/carga-maquina/resumo", headers=h).status_code == 200
    r = client.post("/api/v1/produtos", headers=h, json={"codigo": codigo_unico(), "nome": "Nao pode"})
    assert r.status_code == 403
    assert client.patch("/api/v1/produtos/1", headers=h, json={"nome": "x"}).status_code == 403
    assert client.delete("/api/v1/produtos/1", headers=h).status_code == 403
    # simulacoes so calculam, nao gravam: liberadas para qualquer perfil
    assert client.post("/api/v1/carga-maquina/simular", headers=h, json={"pedidos": []}).status_code == 200


def test_editor_cria_e_edita_mas_nao_exclui(client, editor):
    h = editor["headers"]
    r = client.post("/api/v1/produtos", headers=h, json={"codigo": codigo_unico(), "nome": "Peca A"})
    assert r.status_code == 201
    pid = r.json()["id"]
    assert client.patch(f"/api/v1/produtos/{pid}", headers=h, json={"nome": "Peca A2"}).status_code == 200
    assert client.delete(f"/api/v1/produtos/{pid}", headers=h).status_code == 403


def test_admin_exclui(client, admin, editor):
    r = client.post("/api/v1/produtos", headers=editor["headers"], json={"codigo": codigo_unico(), "nome": "Excluir"})
    pid = r.json()["id"]
    assert client.delete(f"/api/v1/produtos/{pid}", headers=admin["headers"]).status_code == 204
    assert client.get(f"/api/v1/produtos/{pid}", headers=admin["headers"]).status_code == 404


# ------------------------------------------------------------------- usuarios
def test_somente_admin_gerencia_usuarios(client, editor, visualizador):
    assert client.get("/api/v1/usuarios", headers=editor["headers"]).status_code == 403
    assert client.get("/api/v1/usuarios", headers=visualizador["headers"]).status_code == 403
    assert client.get("/api/v1/auditoria", headers=editor["headers"]).status_code == 403


def test_admin_cria_usuario_e_a_senha_provisoria_aparece_uma_vez(client, admin):
    r = client.post("/api/v1/usuarios", headers=admin["headers"],
                    json={"nome": "Maria PCP", "login": f"maria{codigo_unico('')[-6:].lower()}".replace("-", ""),
                          "perfil": "editor"})
    assert r.status_code == 201, r.text
    novo = r.json()
    assert novo["senha_temporaria"] and novo["deve_trocar_senha"] is True
    lista = client.get("/api/v1/usuarios", headers=admin["headers"]).json()
    assert all("senha_temporaria" not in u and "senha_hash" not in u for u in lista)
    # entra com a senha provisoria e e obrigado a trocar
    r2 = client.post("/api/v1/auth/login", json={"login": novo["login"], "senha": novo["senha_temporaria"]})
    assert r2.status_code == 200 and r2.json()["usuario"]["deve_trocar_senha"] is True


def test_admin_nao_remove_o_proprio_acesso_nem_o_ultimo_admin(client, admin):
    uid = admin["id"]
    assert client.patch(f"/api/v1/usuarios/{uid}", headers=admin["headers"], json={"ativo": False}).status_code == 400
    assert client.patch(f"/api/v1/usuarios/{uid}", headers=admin["headers"], json={"perfil": "editor"}).status_code == 400


def test_desativar_usuario_derruba_o_login(client, admin, editor):
    assert client.get("/api/v1/produtos", headers=editor["headers"]).status_code == 200
    r = client.patch(f"/api/v1/usuarios/{editor['id']}", headers=admin["headers"], json={"ativo": False})
    assert r.status_code == 200
    assert client.get("/api/v1/produtos", headers=editor["headers"]).status_code == 401


def test_redefinir_senha(client, admin, editor):
    r = client.post(f"/api/v1/usuarios/{editor['id']}/redefinir-senha", headers=admin["headers"])
    assert r.status_code == 200 and r.json()["senha_temporaria"]
    assert client.get("/api/v1/produtos", headers=editor["headers"]).status_code == 401   # sessao antiga caiu


def test_login_com_formato_invalido_na_criacao(client, admin):
    r = client.post("/api/v1/usuarios", headers=admin["headers"], json={"nome": "X Y", "login": "Com Espaço!", "perfil": "editor"})
    assert r.status_code == 422
    r = client.post("/api/v1/usuarios", headers=admin["headers"], json={"nome": "X Y", "login": "okok", "perfil": "root"})
    assert r.status_code == 422


# ------------------------------------------------------------------ auditoria
def test_auditoria_grava_criar_editar_excluir(client, admin, editor):
    codigo = codigo_unico("AUD")
    r = client.post("/api/v1/produtos", headers=editor["headers"], json={"codigo": codigo, "nome": "Auditada"})
    pid = r.json()["id"]
    client.patch(f"/api/v1/produtos/{pid}", headers=editor["headers"], json={"nome": "Auditada 2"})
    client.delete(f"/api/v1/produtos/{pid}", headers=admin["headers"])

    regs = client.get(f"/api/v1/auditoria?entidade=produto&limit=500", headers=admin["headers"]).json()
    do_produto = [x for x in regs if x["entidade_id"] == str(pid)]
    # o SQLite reaproveita ids de registros excluidos: vale o registro MAIS RECENTE de cada acao
    por_acao = {}
    for x in do_produto:                       # a lista vem do mais recente para o mais antigo
        por_acao.setdefault(x["acao"], x)
    assert set(por_acao) == {"criar", "editar", "excluir"}

    assert por_acao["criar"]["usuario_login"] == editor["login"]
    assert por_acao["criar"]["dados_depois"]["codigo"] == codigo
    assert por_acao["criar"]["ip"]

    assert por_acao["editar"]["usuario_login"] == editor["login"]
    assert por_acao["editar"]["dados_antes"] == {"nome": "Auditada"}
    assert por_acao["editar"]["dados_depois"] == {"nome": "Auditada 2"}

    assert por_acao["excluir"]["usuario_login"] == admin["login"]
    assert por_acao["excluir"]["dados_antes"]["codigo"] == codigo


def test_auditoria_registra_logins_e_falhas(client, admin):
    login, senha, uid = criar_usuario("editor")
    client.post("/api/v1/auth/login", json={"login": login, "senha": "errada999"})
    client.post("/api/v1/auth/login", json={"login": login, "senha": senha})
    regs = client.get(f"/api/v1/auditoria?usuario_id={uid}&limit=50", headers=admin["headers"]).json()
    acoes = {x["acao"] for x in regs}
    assert {"login", "login_falhou"} <= acoes


def test_auditoria_nunca_guarda_senha_nem_hash(client, admin):
    r = client.post("/api/v1/usuarios", headers=admin["headers"],
                    json={"nome": "Sem Vazar", "login": f"sv{codigo_unico('')[-6:].lower()}".replace("-", ""), "perfil": "visualizador"})
    senha = r.json()["senha_temporaria"]
    regs = client.get("/api/v1/auditoria?entidade=usuario&limit=500", headers=admin["headers"]).json()
    texto = json.dumps(regs)
    assert "senha_hash" not in texto and "$2b$" not in texto and senha not in texto


def test_auditoria_filtra_por_usuario_e_periodo(client, admin, editor):
    client.post("/api/v1/produtos", headers=editor["headers"], json={"codigo": codigo_unico(), "nome": "Filtro"})
    so_dele = client.get(f"/api/v1/auditoria?usuario_id={editor['id']}", headers=admin["headers"]).json()
    assert so_dele and all(x["usuario_id"] == editor["id"] for x in so_dele)
    futuro = client.get("/api/v1/auditoria?data_inicio=2999-01-01T00:00:00", headers=admin["headers"]).json()
    assert futuro == []


# ------------------------------------------------------------- endurecimento
def test_cabecalhos_de_seguranca(client, visualizador):
    r = client.get("/api/v1/produtos", headers=visualizador["headers"])
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
    assert r.headers["referrer-policy"] == "same-origin"
    assert r.headers["cache-control"] == "no-store"


def test_cors_em_desenvolvimento_so_libera_o_vite(client):
    ok = client.options("/api/v1/health", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    estranho = client.options("/api/v1/health", headers={"Origin": "http://site-malicioso.com", "Access-Control-Request-Method": "GET"})
    assert "access-control-allow-origin" not in estranho.headers


def test_requisicao_grande_demais_e_recusada(client, editor):
    r = client.post("/api/v1/produtos", headers=editor["headers"], content=b"x" * 1_100_000)
    assert r.status_code == 413


def test_api_inexistente_da_404(client, visualizador):
    assert client.get("/api/v1/nao-existe", headers=visualizador["headers"]).status_code == 404


def test_servidor_do_frontend_nao_le_arquivos_fora_do_dist(client):
    for caminho in ("/..%2fbackend%2f.env", "/%2e%2e/backend/.env", "/..%2f..%2fbackend%2fpcp.db",
                    "/assets/..%2f..%2fbackend%2f.env", "/....//backend/.env"):
        r = client.get(caminho)
        corpo = r.content
        assert b"SECRET_KEY" not in corpo, caminho
        assert not corpo.startswith(b"SQLite format 3"), caminho
    assert client.get("/").status_code == 200        # a interface continua abrindo


def test_validacao_de_valores_absurdos(client, editor, admin):
    h = editor["headers"]
    assert client.post("/api/v1/maquinas", headers=h, json={"codigo": codigo_unico("M"), "nome": "M", "horas_por_dia": 30}).status_code == 422
    assert client.post("/api/v1/maquinas", headers=h, json={"codigo": codigo_unico("M"), "nome": "M", "horas_extras_dia": 20}).status_code == 422
    assert client.post("/api/v1/produtos", headers=h, json={"codigo": "x" * 80, "nome": "N"}).status_code == 422
    pid = client.post("/api/v1/produtos", headers=h, json={"codigo": codigo_unico(), "nome": "P"}).json()["id"]
    r = client.post("/api/v1/ordens", headers=h, json={"numero": "OP-1", "produto_id": pid, "quantidade_planejada": -5})
    assert r.status_code == 422
    r = client.post("/api/v1/ordens", headers=h, json={"numero": "OP-1", "produto_id": pid, "quantidade_planejada": 99_999_999_999})
    assert r.status_code == 422
    r = client.post("/api/v1/roteiro/calcular-horas", headers=h, json={"produto_id": pid, "quantidade": -1})
    assert r.status_code == 422
    r = client.post("/api/v1/carga-maquina/simular", headers=h, json={"dias_uteis": 400, "pedidos": []})
    assert r.status_code == 422
    r = client.put("/api/v1/carga-maquina/mod", headers=h, json={"setores": [{"operacao_codigo": "USINAGEM", "quantidade_operadores": 100000}]})
    assert r.status_code == 422


# ----------------------------------------------------------------- configuracao
def test_secret_key_insegura_e_substituida(monkeypatch, tmp_path):
    from app.core import config
    monkeypatch.setattr(config, "ENV_FILE", tmp_path / ".env")
    monkeypatch.setenv("SECRET_KEY", "sua-chave-secreta-aqui-troque-em-producao")
    chave = config.garantir_secret_key()
    assert chave not in config._CHAVES_INSEGURAS and len(chave) >= 32
    assert (tmp_path / ".env").read_text(encoding="utf-8").count("SECRET_KEY=") == 1
    assert config.garantir_secret_key() == chave              # na segunda vez reaproveita a mesma


def test_producao_desliga_docs_cors_e_ativa_csp(tmp_path):
    """Sobe o app em outro processo com PCP_AMBIENTE=producao."""
    codigo = textwrap.dedent("""
        import os, sys
        sys.path.insert(0, sys.argv[1])
        os.environ.update(DATABASE_URL="sqlite:///" + sys.argv[2], SECRET_KEY="k"*48,
                          PCP_ADMIN_SENHA="AdminTeste123", PCP_AMBIENTE="producao")
        from fastapi.testclient import TestClient
        from app.main import app
        c = TestClient(app)
        r = c.get("/api/v1/health")
        print("docs", c.get("/docs").status_code)
        print("redoc", c.get("/redoc").status_code)
        print("openapi", c.get("/openapi.json").status_code)
        print("csp", "content-security-policy" in r.headers)
        print("frame", r.headers.get("x-frame-options"))
        o = c.options("/api/v1/health", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"})
        print("cors", "access-control-allow-origin" in o.headers)
    """)
    saida = subprocess.run(
        [sys.executable, "-c", codigo, str(BACKEND), (tmp_path / "prod.db").as_posix()],
        capture_output=True, text=True, timeout=120,
    )
    linhas = dict(l.split(" ", 1) for l in saida.stdout.splitlines() if l.split(" ", 1)[0] in
                  ("docs", "redoc", "openapi", "csp", "frame", "cors"))
    assert linhas.get("docs") == "404", saida.stdout + saida.stderr
    assert linhas.get("redoc") == "404"
    assert linhas.get("openapi") == "404"
    assert linhas.get("csp") == "True"
    assert linhas.get("frame") == "DENY"
    assert linhas.get("cors") == "False"
