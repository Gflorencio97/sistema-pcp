# Documentação — Sistema PCP Evoluttion

Planejamento e Controle da Produção da fábrica da Evoluttion Automotive.
Acesso em produção (rede interna): **http://192.168.15.5:8085**

## Por onde começar

| Preciso de... | Leia |
|---|---|
| Entender o que o sistema faz e as regras da fábrica | [01 — Visão geral e regras de negócio](01-visao-geral-e-regras.md) |
| Saber como usar cada tela | [02 — Manual de uso](02-manual-de-uso.md) |
| Entender como os prazos e cargas são calculados | [03 — Cálculos](03-calculos.md) |
| Ver a estrutura técnica (pastas, camadas, fluxo) | [04 — Arquitetura](04-arquitetura.md) |
| Consultar tabelas e campos do banco | [05 — Banco de dados](05-banco-de-dados.md) |
| Consultar os endpoints da API | [06 — API](06-api.md) |
| Instalar, atualizar, fazer backup ou resolver problemas no servidor | [07 — Operação do servidor](07-operacao-servidor.md) |
| Rodar e alterar o código | [08 — Desenvolvimento](08-desenvolvimento.md) |

## Resumo em 30 segundos

- **O que é:** sistema web que simula a viabilidade de pedidos, mostra a carga das máquinas e programa as ordens de produção (OPs) num Gantt.
- **Como roda:** um único processo Python (FastAPI) serve a API e a interface (React compilada) na porta **8085**, com banco **SQLite** (`backend/pcp.db`).
- **Onde roda:** Windows Server da TI, iniciado por uma Tarefa Agendada.
- **Dados:** ficam só no servidor. O banco **não** é versionado no git.
- **Backup:** automático, todo dia às 23:00, em `C:\PCP-Backups` (30 dias).
- **Documentação interativa da API:** `http://192.168.15.5:8085/docs`.

## Convenções deste repositório

- Código e textos de tela em português.
- Datas e horas sem fuso horário (horário local da fábrica).
- O frontend compilado (`frontend/dist`) **é versionado**, porque o servidor não tem Node.js.
