# 05 — Banco de dados

SQLite, arquivo `backend/pcp.db`. Esquema definido em `backend/app/models/models.py`.
Para outro caminho, defina a variável de ambiente `DATABASE_URL` (por exemplo `sqlite:///C:/dados/pcp.db`).

## Diagrama

```
produtos 1───* roteiro_produto *───1 maquinas
   │                                    │
   └──* ordens_producao *───────────────┘
              │
              └──* etapas_ordem *───1 maquinas

setores_mod  (por operacao_codigo, sem chave estrangeira)
```

## Tabelas

### `maquinas`
| Campo | Tipo | Observação |
|---|---|---|
| id | int PK | |
| codigo | texto, único | ex.: `LINHA-04`, `MEK-01`, `INSP-01` |
| nome | texto | |
| setor | texto | |
| operacao_codigo | texto | operação que a linha executa (`USINAGEM`, `FUR_INC`...) |
| horas_por_dia | decimal | padrão 8,8; hoje o calendário usa os turnos |
| capacidade_hora | decimal | opcional |
| status | texto | `ativa`, `manutencao`, `inativa` |
| turno_manha, turno_tarde, turno_noite | booleano | 1º e 2º turnos usados no calendário; o noturno é ignorado |
| horas_extras_dia | decimal | HE disponíveis por dia (0 a 8) |

### `produtos`
`id`, `codigo` (único), `nome`, `descricao`, `codigo_fundido`, `unidade_medida` (padrão `UN`), `ativo`, `criado_em`, `atualizado_em`.

### `roteiro_produto`
Uma linha por operação de cada produto. Único por (`produto_id`, `operacao_codigo`).

| Campo | Observação |
|---|---|
| produto_id | FK `produtos` |
| operacao_codigo, operacao_nome, ordem | as 6 operações, ordem 1 a 6 |
| pcs_hora | peças/hora (ou horas/peça se < 1); vazio = inativa |
| maquina_id | FK `maquinas`, linha padrão da operação |
| ativo | booleano |

### `ordens_producao`
| Campo | Observação |
|---|---|
| numero | texto, **indexado e não único** |
| produto_id, maquina_id | FKs; `maquina_id` é a linha escolhida ao lançar |
| quantidade_planejada, quantidade_produzida | decimais; produzida é apontada manualmente |
| status | `planejada`, `em_andamento`, `pausada`, `concluida`, `cancelada` |
| prioridade | `baixa`, `normal`, `alta`, `urgente` |
| data_inicio_planejada, data_fim_planejada | sem fuso horário |
| data_inicio_real, data_fim_real | reservados |
| fim_manual | `true` = fim ajustado a mão; `false` = calculado |
| observacoes | texto livre |

### `etapas_ordem`
Gerada a partir do roteiro; **regravada** quando a OP muda.

| Campo | Observação |
|---|---|
| ordem_id | FK `ordens_producao`; apaga junto com a OP |
| sequencia | 1, 2, 3... na ordem do roteiro |
| operacao_codigo, operacao_nome | |
| maquina_id | linha da etapa |
| quantidade, pcs_hora | valores usados no cálculo |
| data_inicio_planejada, data_fim_planejada | período calculado |

### `setores_mod`
Mão de obra direta por operação. Único por `operacao_codigo`.
`setor_nome`, `quantidade_operadores` (padrão 1), `horas_dia_operador` (padrão 8,8), `observacoes`, `atualizado_em`.

### `usuarios`
`id`, `nome`, `login` (único), `senha_hash` (bcrypt), `perfil` (`admin`, `editor`, `visualizador`), `ativo`, `deve_trocar_senha`, `token_versao` (sobe ao trocar/redefinir a senha e derruba as sessões), `criado_em`, `ultimo_acesso`.

### `auditoria`
`id`, `usuario_id`, `usuario_login`, `acao` (`criar`, `editar`, `excluir`, `login`, `login_falhou`), `entidade`, `entidade_id`, `dados_antes` e `dados_depois` (JSON), `ip`, `data_hora`. Nunca guarda senha nem hash.

## Migrações automáticas

Rodam na inicialização (`backend/app/main.py`) e são idempotentes. Detalhes e ordem em [Arquitetura](04-arquitetura.md#inicialização-e-migrações).

Quando há migração pendente que altera dados, o sistema cria antes uma cópia ao lado do banco:

```
backend/pcp_antes_migracao_AAAAMMDD_HHMMSS.db
```

Essa cópia não é versionada e pode ser apagada depois de conferir a atualização.

## Banco inicial

`backend/pcp_inicial.db` contém só máquinas e setores MOD (sem produtos, roteiros e ordens). Para um ambiente novo:

```powershell
Copy-Item backend\pcp_inicial.db backend\pcp.db
```

## Backup e restauração

Veja [Operação do servidor](07-operacao-servidor.md#backup).
