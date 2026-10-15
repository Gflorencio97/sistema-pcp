# 01 — Visão geral e regras de negócio

## O que o sistema resolve

Substitui planilhas manuais de PCP. Permite:

1. **Simular pedidos:** quantas horas cada operação exige e qual é o gargalo (Calculadora).
2. **Ver a carga das máquinas:** ocupação por linha, por setor e por mês, com a comparação Homem × Máquina (Carga Máquina).
3. **Programar a produção:** sequenciar as OPs por linha em um Gantt, com conflitos e prazos (Programação).
4. **Cadastrar** produtos, roteiros, máquinas e ordens.

## Glossário

| Termo | Significado |
|---|---|
| **OP** | Ordem de Produção: um lote de um produto, com quantidade, linha e datas. |
| **Operação** | Uma das 6 fases do processo (tabela abaixo). |
| **Linha / máquina** | Equipamento que executa uma operação. Linhas do mesmo setor são equivalentes. |
| **Roteiro** | Para cada produto: taxa (peças/hora) e linha de cada operação. |
| **Etapa** | Uma operação de uma OP específica, com linha e período calculados. |
| **pçs/h** | Peças por hora. Valores menores que 1 são tratados como horas por peça. |
| **MOD** | Mão de Obra Direta: operadores alocados por setor. |
| **HE** | Hora extra: horas adicionais por dia, cadastradas por máquina. |
| **Fundido** | Matéria-prima bruta do produto (`codigo_fundido`). |
| **Lote de transferência** | Quantidade de peças que uma operação libera antes da próxima começar. |

## Processo industrial (sequência fixa)

| # | Código | Operação | Setor |
|---|---|---|---|
| 1 | `USINAGEM` | Usinagem | Centros de usinagem e tornos |
| 2 | `FUR_INC` | Furação incremental | Furação |
| 3 | `FUR_07` | Furação 0,7 | Furação (Mekano) |
| 4 | `BRUNIMENTO` | Brunimento | Brunideiras |
| 5 | `ROLETAMENTO` | Roletamento | Roletamento |
| 6 | `LAV_INSP` | Inspeção | Inspeção (a antiga linha de Lavagem foi removida) |

O código interno `LAV_INSP` foi mantido por compatibilidade; só o nome exibido é "Inspeção".

## Turnos e calendário

Trabalha-se de **segunda a sexta**. Sábado e domingo não produzem.

| Turno | Início | Fim | Horas produtivas |
|---|---|---|---|
| 1º | 06:09 | 15:48 | 8,8 h |
| 2º | 15:48 | 01:09 (dia seguinte) | 8,3 h |
| 3º | — | — | não existe |

- Cada máquina tem marcado no cadastro quais turnos opera (Manhã = 1º, Tarde = 2º).
- **Capacidade por dia:** 1 turno = 8,8 h; 2 turnos = 17,1 h; mais as HE cadastradas na máquina (0 a 8 h, somadas depois do último turno).
- O 2º turno de sexta termina na madrugada de sábado (01:09).

## Módulos (telas)

| Tela | Para que serve |
|---|---|
| **Dashboard** | Visão executiva: ocupação, OPs em produção, entregas dos próximos 7 dias, alertas. |
| **Carga Máquina** | Ocupação das máquinas e balanço Homem × Máquina, geral ou por mês. |
| **Programação** | Gantt por linha, com etapas, conflitos e criação rápida de OP. |
| **Calculadora** | Simula horas por operação para um pedido e lança a OP. |
| **Ordens de Produção** | Lista, filtros e cadastro de OPs. |
| **Máquinas** | Cadastro de linhas, turnos e HE. |
| **Produtos** | Catálogo, roteiro técnico e fundido. |
| **Guia & Manual** | Ajuda dentro do sistema. |

## Regras importantes

- **Produção apontada é manual.** O sistema não conta peças sozinho: o operador do sistema informa a quantidade produzida no modal da OP no Gantt. A porcentagem do Gantt e o que "falta produzir" na Carga Máquina dependem disso.
- **O número da OP pode repetir** (mesmo número em meses diferentes ou no mesmo mês).
- **Não há login.** O acesso é restrito à rede interna da empresa.
- **Os dados reais ficam só no servidor.** O notebook de desenvolvimento usa um banco de teste.
