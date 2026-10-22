# 08 — Desenvolvimento

Para quem vai alterar o código.

## Requisitos

- Python 3.10+ (o projeto já usa um `backend\venv`).
- Node.js 20+ e npm (só para o frontend).
- Git.

## Rodar localmente

Backend (porta 8000):

```powershell
cd backend
.\venv\Scripts\activate
python -m uvicorn app.main:app --reload --port 8000
```

Frontend (porta 5173):

```powershell
cd frontend
npm install        # primeira vez
npm run dev
```

Ou, no Windows, `iniciar_sistema.bat` na raiz abre os dois.

- Interface: http://localhost:5173
- API: http://localhost:8000/docs

O frontend em desenvolvimento lê a URL da API em `frontend/.env.local` (não versionado):

```
VITE_API_URL=http://localhost:8000/api/v1
```

## Banco de desenvolvimento

- O banco local é `backend/pcp.db` (ignorado pelo git).
- Para começar limpo: `Copy-Item backend\pcp_inicial.db backend\pcp.db`.
- Para testar contra outra cópia sem tocar no banco: defina `DATABASE_URL` antes de subir, por exemplo
  `$env:DATABASE_URL = "sqlite:///C:/temp/teste.db"`.

## Build de produção

O servidor serve `frontend/dist` e não tem Node.js. Depois de **qualquer** alteração no frontend:

```powershell
cd frontend
npm run build        # roda tsc e vite build
cd ..
git add frontend/dist
```

A URL da API no build vem de `frontend/.env.production` (`VITE_API_URL=/api/v1`), que tem prioridade sobre o `.env.local`. Confira que o bundle não contém `localhost:8000`.

## Fluxo de trabalho (git)

1. Alterar e testar no notebook (localhost).
2. `npm run build` se mexeu no frontend.
3. Commit na `main` e `git push origin main`.
4. No servidor: backup e `atualizar_servidor.bat` (veja [Operação do servidor](07-operacao-servidor.md#atualização)).

Mensagens de commit no formato `tipo(escopo): descrição` (`feat`, `fix`, `docs`, `chore`).

## Onde mexer para...

| Quero... | Arquivos |
|---|---|
| Mudar horários ou horas dos turnos | `backend/app/services/etapa_service.py` (`TURNO_1`, `TURNO_2`) |
| Mudar o lote de transferência | `etapa_service.py` (`LOTE_TRANSFERENCIA`) |
| Mudar as 6 operações da fábrica | `backend/app/models/models.py` (`OPERACOES_FABRICA`) e telas que listam setores |
| Mudar o cálculo de carga e MOD | `backend/app/services/carga_maquina_service.py` |
| Mudar como o Gantt desenha | `frontend/src/components/GanttChart.tsx` |
| Nova rota da API | `api/routes/`, registrar em `app/main.py` |
| Novo campo em tabela | `models.py`, `schemas/`, migração curta em `app/main.py`, tipos em `frontend/src/types/index.ts` |

## Como criar uma migração

Não há Alembic em uso. O padrão é uma função idempotente em `backend/app/main.py`, chamada depois do `create_all`:

```python
def _adicionar_coluna_exemplo():
    from sqlalchemy import text
    with engine.begin() as conn:
        cols = [r[1] for r in conn.execute(text("PRAGMA table_info('maquinas')")).fetchall()]
        if "campo_novo" not in cols:
            conn.execute(text("ALTER TABLE maquinas ADD COLUMN campo_novo FLOAT DEFAULT 0"))
```

Regras: ser **idempotente**, nunca apagar dados sem backup, e incluir a verificação no `_backup_antes_de_migrar` quando alterar dados existentes.

## Testes

Há testes automatizados de segurança e de regressão do fluxo de negócio (pytest + `TestClient`, com banco temporário):

```powershell
cd backend
pip install -r requirements-dev.txt
cd ..
python -m pytest backend/tests -q
```
Cobrem login certo e errado, bloqueio após 5 tentativas, 401 sem token, 403 por perfil, exclusão pelo admin, auditoria, troca de senha, usuários, cabeçalhos, CORS, limite de tamanho, leitura de arquivos fora do `dist`, validação de valores, `SECRET_KEY` e o modo produção.

O cálculo de etapas/turnos e a Carga Máquina ainda não têm testes próprios. Além dos testes, a verificação manual continua útil:

1. Subir o backend contra uma **cópia** do banco (`DATABASE_URL`).
2. Chamar `/api/v1/health`, `/ordens/gantt`, `/ordens/sugerir-fim` e `/carga-maquina/resumo`.
3. `npx tsc -b --noEmit` no frontend (checagem de tipos) e `npm run build`.

Vale priorizar testes automatizados para `etapa_service` (calendário de turnos) e `carga_maquina_service`, que concentram a regra de negócio.

## Pontos de atenção

- Não commitar `backend/pcp.db` nem `pcp_antes_migracao_*.db`.
- `Dockerfile` e `start.sh` (deploy em nuvem) não são usados em produção e estão desatualizados em relação ao banco (`start.sh` ainda procura `backend/pcp.db` versionado).
- Padrões antigos que ainda aparecem no código: `horas_por_dia = 17,15` no schema de máquina nova e no seletor "Turno" da Carga Máquina.
