"""Garante que o fluxo de negocio que ja existia continua funcionando, agora com login."""
from conftest import codigo_unico


def test_fluxo_completo_com_login(client, editor, visualizador):
    h = editor["headers"]

    # cadastros
    r = client.post("/api/v1/maquinas", headers=h, json={
        "codigo": codigo_unico("MQ"), "nome": "Linha teste", "setor": "Usinagem",
        "operacao_codigo": "USINAGEM", "turno_manha": True, "turno_tarde": False,
    })
    assert r.status_code == 201, r.text
    maq_id = r.json()["id"]

    r = client.post("/api/v1/produtos", headers=h, json={"codigo": codigo_unico("PR"), "nome": "Peca teste"})
    assert r.status_code == 201
    prod_id = r.json()["id"]

    # roteiro do produto: 60 pecas/hora na usinagem
    r = client.put(f"/api/v1/roteiro/produto/{prod_id}", headers=h, json={
        "itens": [{"operacao_codigo": "USINAGEM", "pcs_hora": 60, "maquina_id": maq_id, "ativo": True}],
    })
    assert r.status_code == 200, r.text
    assert client.get(f"/api/v1/roteiro/produto/{prod_id}", headers=visualizador["headers"]).status_code == 200

    # calculadora e sugestao de fim
    r = client.post("/api/v1/roteiro/calcular-horas", headers=visualizador["headers"],
                    json={"produto_id": prod_id, "quantidade": 600})
    assert r.status_code == 200
    r = client.get("/api/v1/ordens/sugerir-fim", headers=visualizador["headers"], params={
        "produto_id": prod_id, "maquina_id": maq_id, "quantidade": 600, "data_inicio": "2026-11-02T06:09:00",
    })
    assert r.status_code == 200
    assert r.json()["horas_necessarias"] == 10.0          # 600 pecas / 60 por hora

    # OP com fim automatico
    r = client.post("/api/v1/ordens", headers=h, json={
        "numero": codigo_unico("OP"), "produto_id": prod_id, "maquina_id": maq_id,
        "quantidade_planejada": 600, "data_inicio_planejada": "2026-11-02T06:09:00", "fim_manual": False,
    })
    assert r.status_code == 201, r.text
    ordem = r.json()
    assert ordem["data_fim_planejada"] and ordem["fim_manual"] is False
    # 10 h produtivas, 8,8 h por dia: termina no dia seguinte
    assert ordem["data_fim_planejada"].startswith("2026-11-03")

    # leitura por perfil somente-leitura: Gantt, lista, carga e MOD
    v = visualizador["headers"]
    gantt = client.get("/api/v1/ordens/gantt", headers=v).json()
    assert any(l["id"] == ordem["id"] for l in gantt)
    assert client.get("/api/v1/ordens", headers=v).status_code == 200
    assert client.get("/api/v1/ordens?search=OP", headers=v).status_code == 200
    resumo = client.get("/api/v1/carga-maquina/resumo", headers=v)
    assert resumo.status_code == 200 and resumo.json()["total_maquinas"] >= 1
    assert client.get("/api/v1/carga-maquina/resumo?mes=2026-11", headers=v).status_code == 200
    assert client.get("/api/v1/carga-maquina/mod", headers=v).status_code == 200
    assert client.post("/api/v1/carga-maquina/simular", headers=v, json={
        "pedidos": [{"produto_id": prod_id, "quantidade": 100}]}).status_code == 200

    # ajuste manual do fim e volta ao automatico
    r = client.patch(f"/api/v1/ordens/{ordem['id']}", headers=h,
                     json={"data_fim_planejada": "2026-11-10T10:00:00", "fim_manual": True})
    assert r.status_code == 200 and r.json()["fim_manual"] is True
    r = client.patch(f"/api/v1/ordens/{ordem['id']}", headers=h, json={"fim_manual": False})
    assert r.json()["data_fim_planejada"].startswith("2026-11-03")

    # edicao de maquina com HE e edicao do MOD
    assert client.patch(f"/api/v1/maquinas/{maq_id}", headers=h, json={"horas_extras_dia": 2}).status_code == 200
    r = client.put("/api/v1/carga-maquina/mod", headers=h, json={"setores": [
        {"operacao_codigo": "USINAGEM", "quantidade_operadores": 9, "horas_dia_operador": 8.8}]})
    assert r.status_code == 200


def test_frontend_e_assets_continuam_sendo_servidos(client):
    r = client.get("/")
    assert r.status_code == 200 and b'id="root"' in r.content
    assert client.get("/carga-maquina").status_code == 200       # rota do SPA cai no index.html
