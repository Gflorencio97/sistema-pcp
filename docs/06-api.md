# 06 — API

REST em JSON. Base: `http://192.168.15.5:8085/api/v1`.
Documentação interativa (Swagger): só em desenvolvimento (`/docs`); em produção fica desligada.

- **Autenticação:** todas as rotas, exceto `/health` e `/auth/login`, exigem `Authorization: Bearer <token>`. Permissão por método: `GET` qualquer perfil, `POST/PUT/PATCH` editor ou admin, `DELETE` somente admin (as simulações `POST` são liberadas). Veja [Segurança e acesso](09-seguranca-e-acesso.md).
- Datas em ISO 8601 **sem fuso** (`2026-10-15T06:09:00`).
- Listagens aceitam `skip` e `limit` (padrão 100; o frontend pede até 1.000).
- Os endpoints de coleção aceitam com e sem barra final (`/ordens` e `/ordens/`).

## Saúde

| Método | Caminho | Resposta |
|---|---|---|
| GET | `/health` | `{"status": "ok"}` |

## Autenticação — `/auth`

| Método | Caminho | Descrição |
|---|---|---|
| POST | `/auth/login` | Corpo `{"login", "senha"}`. Devolve `access_token`, `expires_in` e o usuário. `401` login/senha inválidos; `429` bloqueado por excesso de tentativas. |
| GET | `/auth/me` | Usuário logado. |
| POST | `/auth/trocar-senha` | Corpo `{"senha_atual", "nova_senha"}`. Devolve um token novo; os antigos deixam de valer. |

## Usuários — `/usuarios` (somente admin)

| Método | Caminho | Descrição |
|---|---|---|
| GET | `/usuarios` | Lista. |
| POST | `/usuarios` | Cria `{nome, login, perfil, senha?}`. Sem `senha`, gera uma provisória e a devolve **uma vez** em `senha_temporaria`. |
| PATCH | `/usuarios/{id}` | Altera `nome`, `perfil` ou `ativo`. Não permite remover o próprio acesso nem o último admin. |
| POST | `/usuarios/{id}/redefinir-senha` | Gera nova senha provisória (devolvida uma vez) e encerra as sessões da pessoa. |

## Auditoria — `/auditoria` (somente admin)

| Método | Caminho | Descrição |
|---|---|---|
| GET | `/auditoria` | Mais recentes primeiro. Filtros: `usuario_id`, `entidade`, `acao`, `data_inicio`, `data_fim`, `skip`, `limit` (máx. 500). |

## Máquinas — `/maquinas`

| Método | Caminho | Descrição |
|---|---|---|
| GET | `/maquinas` | Lista. Filtros: `status`, `setor`, `search`. |
| GET | `/maquinas/{id}` | Detalhe. |
| POST | `/maquinas` | Cria (201). |
| PATCH | `/maquinas/{id}` | Atualiza campos enviados. |
| DELETE | `/maquinas/{id}` | Exclui (204). |

## Produtos — `/produtos`

| Método | Caminho | Descrição |
|---|---|---|
| GET | `/produtos` | Lista. Filtros: `ativo`, `search` (nome ou código). |
| GET | `/produtos/{id}` | Detalhe. |
| POST | `/produtos` | Cria (201). Cria também as 6 operações do roteiro. `400` se o código já existe. |
| PATCH | `/produtos/{id}` | Atualiza. |
| DELETE | `/produtos/{id}` | Exclui (204). |

## Roteiro — `/roteiro`

| Método | Caminho | Descrição |
|---|---|---|
| GET | `/roteiro/operacoes` | As 6 operações da fábrica. |
| GET | `/roteiro/produto/{produto_id}` | Roteiro do produto. |
| PUT | `/roteiro/produto/{produto_id}` | Salva o roteiro completo (taxas e linhas). |
| PATCH | `/roteiro/item/{roteiro_id}` | Atualiza um item. |
| POST | `/roteiro/calcular-horas` | Horas por operação para `produto_id` e `quantidade`. |

## Ordens de produção — `/ordens`

| Método | Caminho | Descrição |
|---|---|---|
| GET | `/ordens` | Lista. Filtros: `status`, `maquina_id`, `produto_id`, `prioridade`, `search` (número). |
| GET | `/ordens/gantt` | Linhas do Gantt (uma por etapa). Filtros: `data_inicio`, `data_fim`, `maquina_id`, `incluir_concluidas`. |
| GET | `/ordens/sugerir-fim` | Fim sugerido. Parâmetros: `produto_id`, `quantidade`, `maquina_id`, `data_inicio`. `404` se a operação da linha não tem taxa no roteiro. |
| GET | `/ordens/{id}` | Detalhe. |
| POST | `/ordens` | Cria (201). `409` se houver conflito de agenda na linha. |
| PATCH | `/ordens/{id}` | Atualiza e regenera as etapas se mudar linha, datas, quantidade, produto ou `fim_manual`. |
| DELETE | `/ordens/{id}` | Exclui, com as etapas (204). |

### Corpo de criação (`POST /ordens`)

```json
{
  "numero": "RCCD-00180.0",
  "produto_id": 3,
  "maquina_id": 4,
  "quantidade_planejada": 4000,
  "prioridade": "normal",
  "data_inicio_planejada": "2026-10-15T06:09:00",
  "data_fim_planejada": null,
  "fim_manual": false,
  "observacoes": null
}
```

Com `fim_manual: false` o fim enviado é substituído pelo calculado. No `PATCH`, enviar `data_fim_planejada` sem `fim_manual` marca a OP como manual.

### Resposta de `GET /ordens/sugerir-fim`

```json
{
  "data_inicio": "2026-10-15T06:09:00",
  "data_fim": "2026-10-21T09:43:00",
  "horas_necessarias": 38.46,
  "pcs_hora": 26.0,
  "horas_por_dia": 8.8
}
```

### Campos específicos do Gantt (`GET /ordens/gantt`)

Além dos dados da OP e da linha: `etapa_id`, `etapa_seq`, `etapa_total`, `etapa_nome`, `ordem_maquina_id`, `ordem_data_inicio`, `ordem_data_fim`, `ordem_fim_calculado`, `ordem_fim_manual` e `falta_capacidade_dias` (só na etapa da linha escolhida).

## Carga Máquina — `/carga-maquina`

| Método | Caminho | Descrição |
|---|---|---|
| GET | `/carga-maquina/resumo` | Dashboard de carga. Parâmetros: `dias_uteis` (22), `horas_dia` (8,8), `mes` (`AAAA-MM`, opcional). |
| POST | `/carga-maquina/simular` | Mesmo resumo somando pedidos simulados (`pedidos[{produto_id, quantidade}]`). |
| GET | `/carga-maquina/mod` | Parametrização de mão de obra por setor. |
| PUT | `/carga-maquina/mod` | Atualiza vários setores. |
| PUT | `/carga-maquina/mod/{operacao_codigo}` | Atualiza um setor. |

## Erros

| Código | Quando |
|---|---|
| 400 | Dado duplicado (código de produto/máquina) ou regra de senha/usuário. |
| 401 | Sem token, token inválido ou sessão encerrada. |
| 403 | Perfil sem permissão, ou troca de senha pendente. |
| 404 | Registro inexistente, ou `sugerir-fim` sem taxa no roteiro. |
| 409 | Conflito de agenda na linha. |
| 413 / 411 | Requisição acima de 1 MB ou sem tamanho declarado. |
| 429 | Login bloqueado por excesso de tentativas. |
| 422 | Validação (quantidade ≤ 0, campos obrigatórios, tamanhos). |
