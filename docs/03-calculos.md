# 03 — Cálculos

Como o sistema chega aos prazos, às etapas e às cargas. Código de referência entre parênteses.

## 1. Taxa de produção

Cada item do roteiro tem `pcs_hora`.

- Valor **maior ou igual a 1** → peças por hora.
- Valor **menor que 1** → entendido como horas por peça e convertido: `taxa = 1 / valor`.
- Valor vazio ou 0 → operação **inativa** (ignorada).

Horas de máquina para uma quantidade: `horas = quantidade ÷ taxa`.

## 2. Calendário de turnos

(`backend/app/services/etapa_service.py`)

- Janelas por dia útil (segunda a sexta): 1º turno 06:09–15:48 (8,8 h) e 2º turno 15:48–01:09 (8,3 h).
- A linha usa só os turnos marcados no cadastro; sem nenhum marcado, assume o 1º.
- **HE:** soma `horas_extras_dia` depois do último turno, 1 hora produtiva por hora de relógio.
- As horas produtivas de um turno são distribuídas **uniformemente** na janela do relógio (o sistema não conhece o horário das paradas): no 1º turno, 8,8 h em 9 h39 min.
- Para avançar `X` horas produtivas a partir de um instante, o sistema só consome as janelas de turno e pula fins de semana. O turno da sexta pode terminar no sábado às 01:09.

## 3. Data de fim da OP

Há dois modos, guardados em `ordens_producao.fim_manual`:

| Modo | Quando | Fim da OP |
|---|---|---|
| **Automático** (`false`) | Padrão ao lançar | `início + horas necessárias`, dentro dos turnos da linha escolhida |
| **Manual** (`true`) | Quando o usuário edita o fim | Exatamente a data informada |

- **Sugestão ao lançar:** `GET /ordens/sugerir-fim` usa a taxa da operação da linha escolhida (`roteiro_produto`) e os turnos dessa linha.
- Alterar produto, linha, quantidade ou início recalcula o fim (se estiver automático).
- **Voltar ao automático:** botão "Usar cálculo automático" (envia `fim_manual = false`).
- Gravar só a data de fim, sem informar `fim_manual`, marca a OP como manual.
- OPs **concluídas ou canceladas** são mantidas como manuais ao migrar: o histórico não é recalculado.

Exemplo: 4.000 peças a 32 pçs/h = 125 h. Com 1 turno (8,8 h/dia) são ~14,2 dias úteis; com 2 turnos (17,1 h/dia), ~7,3 dias.

## 4. Etapas da OP e o Gantt

(`etapa_service.gerar_etapas`, tabela `etapas_ordem`)

Ao criar ou alterar uma OP, as etapas são **regeneradas** a partir do roteiro do produto:

1. Considera só operações **ativas** (taxa > 0), na ordem do roteiro.
2. **Linha da etapa:** a do roteiro. Na operação da **linha escolhida** na OP, vale a linha escolhida.
3. **Etapa da linha escolhida (âncora):** modo manual usa as datas digitadas; modo automático calcula pelo item 3.
4. **Demais etapas — produção em fluxo:**
   - **Início:** quando a etapa anterior já liberou o primeiro lote (`LOTE_TRANSFERENCIA`, hoje **100 peças**).
   - **Fim:** o maior entre (a) início + horas pela própria taxa e (b) fim da etapa anterior + tempo do último lote.
5. A etapa mais lenta comanda o prazo; as seguintes seguem logo atrás.

O Gantt (`GET /ordens/gantt`) devolve **uma linha por etapa**. OPs sem etapas aparecem com uma barra só.

### Aviso "faltam Nd"
Na barra da linha escolhida: `necessário = quantidade ÷ taxa` contra as horas produtivas disponíveis entre início e fim (calendário da linha). Os dias que faltam são `⌈déficit ÷ capacidade por dia⌉`. Em modo automático o déficit é sempre 0.

## 5. Carga Máquina

(`carga_maquina_service.calcular_dashboard_carga_maquina`)

**Demanda (horas ocupadas):**
- Considera OPs **planejadas** e **em andamento**.
- Por OP, `restante = planejada − produzida`.
- Para cada item de roteiro ativo com **linha e taxa**, soma `restante ÷ taxa` na linha do item.
- OP sem roteiro distribuído e com linha própria usa **20 pçs/h** (suposição fixa).

**Modo mensal:** cada OP entra com a fração de seus **dias úteis** (segunda a sexta, entre início e fim planejados) que caem no mês. OP sem datas não entra.

**Capacidade:** `dias_úteis × horas/dia × linhas`. As horas/dia vêm do seletor "Turno" da tela (padrão 8,8).

**Status:** acima de 100% = sobrecarga; de 80% a 100% = atenção; abaixo = normal.

**MOD (Homem × Máquina), por setor:**
- `operadores disponíveis` = quantidade cadastrada em `setores_mod` (padrão 1 se não houver cadastro).
- `horas por operador no mês` = `dias úteis × horas_dia_operador`.
- `operadores necessários` = `horas ocupadas do setor ÷ horas por operador`.
- `ocupação MOD` = `necessários ÷ disponíveis`. Setor sem operador cadastrado aparece com 0% (a operação pode não usar operador).

**Tipo de gargalo:** `critico_total` (máquina e pessoas acima de 100%), `gargalo_maquina`, `gargalo_mao_de_obra`, `atencao`, `equilibrado`.

## 6. Calculadora

`POST /roteiro/calcular-horas`: para cada operação, `horas = quantidade ÷ taxa` e `dias = horas ÷ horas/dia da linha`. O gargalo é a operação de maior tempo.

## 7. Limitações conhecidas

- A **Carga Máquina** lê o roteiro direto da OP, não as etapas geradas; as duas visões podem divergir quando a linha de uma etapa foi alterada.
- O **lote de transferência** é uma constante global (100), ainda não cadastrável por produto.
- O seletor "Turno" da Carga Máquina e o padrão de máquina nova ainda citam 17,15 h e 24 h, anteriores às regras de 17,1 h e sem 3º turno.
- **Dias úteis** é manual (22 por padrão); feriados não são considerados no calendário do Gantt.
- O cálculo de etapas não impede duas OPs na mesma linha ao mesmo tempo; o Gantt apenas sinaliza o conflito.
