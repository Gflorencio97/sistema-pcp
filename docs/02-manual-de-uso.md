# 02 — Manual de uso

Guia por tarefa, para quem opera o sistema. Acesso: **http://192.168.15.5:8085** (rede da empresa).

> Se a página abrir com dados estranhos depois de uma atualização, pressione **Ctrl+F5**.

## Entrar no sistema

1. Abra o endereço e informe **login** e **senha**.
2. No **primeiro acesso** (ou depois de uma redefinição), o sistema pede para você **trocar a senha provisória**: mínimo de 8 caracteres, com letras e números.
3. O nome e o perfil aparecem no topo, com o botão **Sair**. A sessão dura 8 horas.
4. **5 tentativas erradas** bloqueiam o acesso por 5 minutos.

O que você vê depende do perfil: o **visualizador** só consulta (sem botões de criar, editar ou excluir); o **editor** cria e edita; só o **admin** exclui e acessa **Usuários** e **Auditoria**.

## Cadastros (fazer uma vez)

### Cadastrar um produto
1. Menu **Produtos → Novo Produto**.
2. Preencha **código**, **nome** e, se houver, o **código do fundido**.
3. Salve. O sistema cria o roteiro vazio com as 6 operações.

### Preencher o roteiro do produto
1. Em **Produtos**, abra o **Roteiro** do produto.
2. Para cada operação, escolha a **linha** e informe a **taxa em peças/hora**.
3. Operação que o produto não usa: deixe **sem máquina e com 0 pçs/h** (fica inativa e é ignorada nos cálculos).
4. **Salvar Roteiro.**

> Escolha para cada operação uma linha do setor correspondente. Hoje o sistema não impede escolher uma linha de outro setor; isso causa barras sobrepostas no Gantt.

### Cadastrar ou ajustar uma máquina
1. Menu **Máquinas**.
2. Marque os **turnos** em que a linha trabalha (Manhã = 1º turno, Tarde = 2º turno).
3. Informe as **horas extras (HE) por dia**, se houver.

## Lançar uma OP

### Pela Programação (recomendado)
1. **Programação → Nova Ordem (OP)**.
2. Escolha **produto**, **linha** e informe a **quantidade** e o **início**.
3. O **Fim Planejado é preenchido sozinho**, pelas peças/hora do produto e pelos turnos da linha. Abaixo do campo aparece a explicação do cálculo.
4. Se precisar de outra data, **edite o fim**: a OP passa a ser "manual". Para voltar, clique em **Usar cálculo automático**.
5. Salve.

### Pela Calculadora
1. Escolha o produto e a quantidade → **Calcular Horas e Carga Máquina**.
2. Veja horas por operação e o gargalo.
3. **Lançar na Produção** e informe o número da OP.

## Acompanhar e ajustar

### Ler o Gantt
- Cada **linha** é uma máquina, agrupada por setor.
- Uma OP aparece com **uma barra por etapa** (`1/5 Usinagem`, `2/5 Furação 0,7`...), cada uma na linha do roteiro.
- A barra da linha escolhida mostra **"faltam Nd"** quando o prazo digitado não cabe na capacidade.
- **Conflito** (barra com anel vermelho) = duas OPs na mesma linha no mesmo período.
- A linha vermelha vertical é **hoje**.

### Alterar uma OP
Clique na barra → modal:
- Trocar **linha**, **datas**, **status** e **prioridade**.
- Informar a **quantidade produzida** (atualiza a porcentagem e a carga restante).
- **Usar cálculo automático** devolve o fim ao valor calculado (vale ao salvar).

### Filtrar ordens
Em **Ordens de Produção**: busca por número, status, produto, máquina, prioridade e mês. A OP mais recente aparece no topo.

## Carga Máquina

- **Período:** abre em **Por mês** (mês atual). Mude para **Toda a fila (geral)** para somar todas as OPs em aberto.
- **Dias úteis** e **Turno** ajustam a capacidade do cálculo.
- Aba **Homem × Máquina (MOD)**: compara horas de máquina com operadores. **Ajustar Equipe (MOD)** altera a quantidade de operadores por setor.
- Cores: acima de 100% = **sobrecarga**; de 80% a 100% = **atenção**.

## Dúvidas comuns

| Situação | O que fazer |
|---|---|
| "Erro ao salvar. Verifique se o código já existe" | A mensagem é genérica. Veja o erro real no navegador (F12 → Rede) ou confira o código do produto. |
| A barra termina bem depois do que digitei | A OP está em modo automático: a capacidade da linha não cabe no prazo. Aumente turnos/HE, divida a OP ou ajuste o fim. |
| Duas barras da mesma OP na mesma linha | O roteiro do produto liga duas operações à mesma linha. Corrija no roteiro. |
| A porcentagem está em 0% | A produção ainda não foi apontada no modal da OP. |
| Nada abre em outro computador | Confirme o endereço `http://192.168.15.5:8085` e a rede. Veja [Operação do servidor](07-operacao-servidor.md). |
