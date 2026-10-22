# 09 — Segurança e acesso

Como o sistema controla quem entra, o que cada pessoa pode fazer e como isso é registrado.

## Visão geral

| Camada | O que faz |
|---|---|
| **Login** | Cada pessoa tem usuário e senha (bcrypt). O login devolve um token (JWT) válido por 8 horas. |
| **Perfis** | `admin`, `editor` e `visualizador`, aplicados no servidor (resposta 403). |
| **Auditoria** | Registra logins, falhas e toda criação, edição e exclusão de dados. |
| **Servidor** | Sem `/docs` em produção, sem CORS, cabeçalhos de segurança, limite de tamanho, firewall só da rede local. |
| **Operação** | Conta de serviço sem privilégio de administrador (opcional), backup verificável e restauração guiada. |

## Perfis

| Perfil | Consultar | Criar e editar | Excluir | Usuários e auditoria |
|---|---|---|---|---|
| `visualizador` (fábrica, diretoria) | sim | não | não | não |
| `editor` (PCP) | sim | sim | não | não |
| `admin` | sim | sim | sim | sim |

A regra vale por método HTTP em todas as rotas de negócio: `GET` qualquer perfil, `POST/PUT/PATCH` editor ou admin, `DELETE` somente admin.
As simulações (Calculadora e simulação da Carga Máquina) usam `POST`, mas só calculam e **ficam liberadas para todos os perfis**.
No frontend, os botões que o perfil não pode usar ficam escondidos, mas a proteção real está no servidor.

## Primeiro acesso

1. Na primeira inicialização sem nenhum usuário no banco, o sistema cria o **administrador inicial**:
   - login: `admin`;
   - senha: a da variável `PCP_ADMIN_SENHA`, se existir e atender à política; senão, uma senha aleatória, escrita **uma única vez** no `servidor.log`.
2. Para ver a senha gerada (no servidor, na pasta do sistema):
   ```powershell
   Select-String -Path C:\PCP-Evoluttion\servidor.log -Pattern "PRIMEIRO ACESSO" -Context 1,6
   ```
   O `atualizar_servidor.bat` também mostra esse bloco ao final, quando ele existe.
3. Entre com `admin` e a senha. O sistema **obriga a troca** da senha antes de qualquer outra coisa.
4. Depois da troca, a senha do log deixa de valer. Se quiser, apague o bloco "PRIMEIRO ACESSO" do `servidor.log`.

### Criar os demais usuários
No menu **Usuários** (só admin): **Novo usuário**, nome, login, perfil. O sistema gera uma **senha provisória** e a mostra uma única vez; a pessoa é obrigada a trocá-la no primeiro acesso. Também é possível trocar o perfil, desativar/reativar e **redefinir a senha** (isso encerra as sessões abertas da pessoa).

### Regras de senha
- No mínimo 8 caracteres, com letras e números, diferente do login (máximo 72 bytes).
- Guardada apenas como hash bcrypt; nunca em texto puro.
- **Bloqueio:** 5 tentativas erradas seguidas bloqueiam o login por 5 minutos (inclusive com a senha certa). Os valores ficam em `LOGIN_MAX_TENTATIVAS` e `LOGIN_BLOQUEIO_MINUTOS`.
- Trocar ou redefinir a senha, desativar a conta ou mudar o perfil **derruba as sessões** dessa pessoa.
- O bloqueio fica na memória do servidor e zera quando o PCP é reiniciado.

## Auditoria

Tabela `auditoria`: quem (usuário e login), o quê (`criar`, `editar`, `excluir`, `login`, `login_falhou`), em qual registro, **dados antes e depois**, IP e data/hora.
Cobre produtos, roteiros, máquinas, setores MOD, ordens e usuários. **Senhas e hashes nunca são registrados.**
No menu **Auditoria** (só admin): filtros por usuário, tipo de registro, ação e período, com o detalhe campo a campo.

Observações:
- O sistema recalcula automaticamente a data de fim e as etapas de uma OP; esse recálculo também aparece como uma edição feita pelo usuário que alterou a OP.
- O IP é o do computador que fez a requisição. O PCP não usa proxy reverso, então não se confia em cabeçalhos de IP encaminhado.

## Variáveis de ambiente (`backend/.env`)

O arquivo `backend/.env` **não vai para o git**. Todas as variáveis são opcionais:

| Variável | Padrão | Para que serve |
|---|---|---|
| `PCP_AMBIENTE` | `desenvolvimento` | `producao` desliga `/docs`, `/redoc`, `/openapi.json` e o CORS, e liga a CSP. O `iniciar_servidor.bat` já define `producao`. |
| `SECRET_KEY` | gerada | Chave do JWT. Se faltar (ou for um valor de exemplo/curto), o sistema gera uma aleatória e grava em `backend/.env`. |
| `PCP_ADMIN_SENHA` | gerada | Senha do admin inicial (só usada na primeira execução). |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | Validade do login (8 h). |
| `LOGIN_MAX_TENTATIVAS` / `LOGIN_BLOQUEIO_MINUTOS` | `5` / `5` | Bloqueio por tentativas erradas. |
| `MAX_BODY_BYTES` | `1000000` | Tamanho máximo de uma requisição. |
| `DATABASE_URL` | SQLite em `backend/pcp.db` | Outro banco. |

Trocar a `SECRET_KEY` derruba todas as sessões abertas (todos precisam entrar de novo).

## Endurecimento do servidor

- **Documentação da API** (`/docs`, `/redoc`, `/openapi.json`) desligada em produção.
- **CORS:** nenhuma origem liberada em produção (o frontend é servido pela mesma origem). Em desenvolvimento, só `http://localhost:5173`.
- **Cabeçalhos:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`, `Cache-Control: no-store` nas respostas da API e, em produção, `Content-Security-Policy` (somente recursos do próprio servidor).
- **Limite de tamanho:** requisições acima de 1 MB (ou sem tamanho declarado) são recusadas.
- **Validação:** valores absurdos (peças/hora, quantidades, horas, operadores) são recusados com erro 422.
- **Servidor do frontend:** só entrega arquivos de dentro de `frontend/dist`. Antes, um endereço com `../` podia ler arquivos de fora dessa pasta (como o banco); isso foi corrigido e há teste automatizado.
- **Rotas desconhecidas** em `/api/` respondem 404 (antes devolviam `null`).

## Servidor Windows

### Firewall
O instalador libera a porta 8085 **somente para a faixa de rede configurada** no topo de `instalar_servico_automatico.bat`:

```bat
set FAIXA_REDE=192.168.15.0/24
```
Várias faixas separadas por vírgula (`192.168.15.0/24,10.0.0.0/24`). Quem estiver fora da faixa (outra VLAN, VPN) não acessa até a faixa ser incluída. Para aplicar, rode o instalador novamente, como administrador.

### Conta de serviço (opcional, recomendado)
Por padrão a tarefa roda como `SYSTEM`. O script `servidor_windows\configurar_conta_servico.ps1` troca por uma conta local `svc_pcp`, **sem ser administradora**, com permissão apenas em `C:\PCP-Evoluttion` e `C:\PCP-Backups`, sem logon interativo nem remoto.

```powershell
.\servidor_windows\configurar_conta_servico.ps1            # simulacao: so mostra o que faria
.\servidor_windows\configurar_conta_servico.ps1 -Aplicar   # aplica
```
Requisitos e cuidados:
- Executar no PowerShell **como administrador**, no servidor.
- O Python do sistema não pode estar instalado dentro de um perfil de usuário (`C:\Users\...`); o script confere e para, se estiver.
- A senha da conta é gerada e mostrada **uma única vez**: guarde no cofre de senhas da TI. Se for trocada, as tarefas precisam ser registradas de novo.
- **Para desfazer:** execute `instalar_servico_automatico.bat` e `instalar_backup_diario.bat` como administrador (voltam a usar `SYSTEM`).

### Backup e restauração
- **Diário, às 23:00**, com a API de backup do SQLite (cópia consistente com o sistema rodando), verificação de integridade e retenção de 30 dias.
- O `backup.log` registra `SUCESSO` ou `FALHA` em cada execução, e a tarefa termina com erro quando falha.
- **Conferir se está funcionando:**
  ```powershell
  .\servidor_windows\verificar_backup.ps1
  ```
  Mostra o último backup, a idade, a integridade, o último registro do `backup.log` e o estado da tarefa. Termina com código 0 (tudo certo) ou 1 (problema), então pode ser usado em monitoramento.
- **Restaurar:** `servidor_windows\restaurar_backup.bat`, como administrador. Lista os backups, pede para digitar `SIM`, para o sistema, guarda o banco atual em `backend\pcp_antes_restauracao_*.db`, restaura, confere a integridade (e volta ao banco anterior se falhar) e reinicia.

## Riscos que continuam

| Risco | Observação |
|---|---|
| **Tráfego sem criptografia (HTTP)** | Senhas e token trafegam em texto claro na rede interna. Quem capturar o tráfego da rede consegue ler. O ideal é colocar HTTPS na frente (por exemplo, um proxy como IIS/ARR, Caddy ou nginx com certificado interno). |
| **Token no navegador** | O token fica no armazenamento local do navegador. Um computador compartilhado ou comprometido expõe a sessão até o vencimento ou o botão Sair. A CSP reduz o risco de scripts externos. |
| **Servidor e disco** | Quem tem acesso administrativo ao Windows Server pode ler `backend\.env` e o banco. Proteja o acesso ao servidor. |
| **Backup no mesmo disco** | O destino padrão (`C:\PCP-Backups`) fica no disco do banco. Mova para outro disco ou compartilhamento. |
| **Bloqueio em memória** | O contador de tentativas zera quando o PCP reinicia, e um atacante pode bloquear contas de outras pessoas por 5 minutos. |
| **Sem segundo fator** | A proteção do login é só usuário e senha. |
| **Rede** | O firewall limita a origem, mas qualquer computador da faixa liberada alcança a tela de login. |
| **Contas compartilhadas** | Se várias pessoas usarem o mesmo usuário, a auditoria não identifica quem fez cada ação. |
