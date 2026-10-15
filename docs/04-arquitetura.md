# 04 — Arquitetura

## Visão geral

```
 Navegadores da rede interna (qualquer PC)
              │  http://192.168.15.5:8085
              ▼
 ┌───────────────────────────────────────────┐
 │ Windows Server — um único processo Python │
 │                                           │
 │  uvicorn → FastAPI (app.main)             │
 │     ├─ /api/v1/...   API REST (JSON)      │
 │     ├─ /docs         Swagger              │
 │     └─ /  (SPA)      frontend/dist        │
 │              │                            │
 │         SQLAlchemy                        │
 │              ▼                            │
 │        backend/pcp.db  (SQLite)           │
 └───────────────────────────────────────────┘
```

- **Uma porta, um processo:** a API e a interface compilada saem do mesmo servidor, na porta 8085. Não há Node.js nem proxy em produção.
- **Sem autenticação:** protegido apenas pelo acesso à rede interna.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy 2, Pydantic v2, Uvicorn |
| Banco | SQLite (arquivo `backend/pcp.db`) |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, TanStack Query, date-fns, Lucide |
| Servidor | Windows Server, Tarefa Agendada, porta 8085 |

## Estrutura de pastas

```
PCP PROJETO/
├─ backend/
│  ├─ app/
│  │  ├─ main.py            # app FastAPI, CORS, migrações de inicialização, serve o SPA
│  │  ├─ api/routes/        # um arquivo por recurso (maquinas, produtos, ordens, roteiro, carga_maquina)
│  │  ├─ services/          # regras de negócio (ordem, etapa, carga_maquina, roteiro, produto, maquina)
│  │  ├─ models/models.py   # tabelas SQLAlchemy + enums + OPERACOES_FABRICA
│  │  ├─ schemas/           # modelos Pydantic de entrada/saída
│  │  └─ core/              # config (DATABASE_URL) e conexão
│  ├─ pcp.db                # banco real (NÃO versionado)
│  ├─ pcp_inicial.db        # banco limpo (máquinas e MOD) para ambiente novo
│  └─ requirements.txt
├─ frontend/
│  ├─ src/pages/            # Dashboard, CargaMaquina, Programacao, Calculadora, Ordens, Maquinas, Produtos, Ajuda
│  ├─ src/components/       # GanttChart, GanttModalDetalhes, Layout, Sidebar
│  ├─ src/services/         # clientes da API (axios)
│  ├─ src/hooks/            # useSugestaoFim
│  └─ dist/                 # build de produção (versionado)
├─ servidor_windows/        # scripts de instalação, atualização, execução e backup
├─ docs/                    # esta documentação
├─ Dockerfile, start.sh     # deploy em nuvem (não usado em produção)
└─ iniciar_sistema.bat      # atalho de desenvolvimento
```

## Camadas do backend

`rota (api/routes)` → `serviço (services)` → `modelo (models)` → banco.

- **Rotas** validam entrada/saída com os schemas e traduzem erros para HTTP.
- **Serviços** concentram a regra de negócio e o cálculo. Não conhecem HTTP.
- **Modelos** definem tabelas; **schemas** definem o contrato JSON.

## Fluxo: lançar uma OP

```
Formulário (Programação/Ordens)
  ├─ GET  /ordens/sugerir-fim      → fim sugerido (peças/hora + turnos)
  └─ POST /ordens                  → ordem_service.create_ordem
                                      └─ etapa_service.gerar_etapas  (regrava etapas_ordem)
Gantt
  └─ GET  /ordens/gantt            → uma linha por etapa
```

## Inicialização e migrações

Ao subir, `app/main.py` executa, nesta ordem e de forma idempotente:

1. `create_all` — cria tabelas novas.
2. **Cópia de segurança** do banco (`pcp_antes_migracao_AAAAMMDD_HHMMSS.db`), apenas se houver migração pendente de dados.
3. Troca o índice único de `ordens_producao.numero` por índice comum.
4. Adiciona `maquinas.horas_extras_dia`.
5. Adiciona `ordens_producao.fim_manual` (OPs em aberto → automáticas; concluídas/canceladas → manuais).
6. Move a Linha de Lavagem para a Inspeção e renomeia a operação.
7. Gera as etapas das OPs em aberto que ainda não as têm.

Não há Alembic em uso: as migrações são scripts curtos no próprio `main.py`.

## Decisões de projeto

| Decisão | Motivo |
|---|---|
| SQLite em arquivo | Poucos usuários simultâneos e zero administração de banco. |
| `dist` versionado | O servidor não tem Node.js; atualiza-se com `git pull`. |
| URL da API relativa (`/api/v1`) | Funciona em qualquer endereço de acesso. Definida em `frontend/.env.production`. |
| Banco fora do git | Dados reais ficam só no servidor e não são sobrescritos por atualizações. |
| Etapas recalculadas, não editadas | Garante coerência com o roteiro; a flexibilidade vem do modo manual da OP. |
