# 🚀 Guia de Implantação no Windows Server (24h Online)

**Sistema:** PCP Evoluttion Automotive  
**Destino:** Windows Server da TI  

---

## 📋 Pré-requisitos no Windows Server

Apenas 2 programas básicos precisam estar instalados no Windows Server (caso já não estejam):
1. **Git for Windows:** [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. **Python 3.10 ou superior:** [https://www.python.org/downloads/](https://www.python.org/downloads/)  
   *(⚠️ IMPORTANTE: Na tela de instalação do Python, marque a caixinha **"Add Python to PATH"**).*

---

## 🛠️ Passo a Passo de Instalação (5 minutos)

### Passo 1: Acessar o Windows Server via RDP
Conecte no Windows Server pela Área de Trabalho Remota.

### Passo 2: Clonar o Repositório
Abra o Prompt de Comando (CMD) ou PowerShell no servidor e escolha uma pasta (ex: `C:\Sistemas\` ou `D:\Projetos\`):

```cmd
cd C:\
git clone https://github.com/Gflorencio97/sistema-pcp.git "PCP-Evoluttion"
cd PCP-Evoluttion
```

### Passo 3: Configurar Inicialização Automática 24/7
1. Entre na pasta `servidor_windows`.
2. Clique com o botão direito no arquivo **`instalar_servico_automatico.bat`** e escolha **"Executar como Administrador"**.
3. O script criará a tarefa no Agendador do Windows. Pronto!

---

## 🌐 Como a Fábrica e Diretoria Acessam

Qualquer computador ou celular conectado na rede da empresa acessa digitando:

👉 **`http://<IP_DO_SERVIDOR>:8085`**  
*(Exemplo: `http://192.168.15.10:8085`)*

---

## 🔄 Como Atualizar Quando Você Fizer Mudanças

Você continuará programando e testando no seu notebook normalmente. Quando subir novidades no GitHub (`git push`):

1. Acesse o Windows Server.
2. Dê dois cliques em **`servidor_windows\atualizar_servidor.bat`**.
3. Ele baixa as alterações do Git e reinicia o PCP sozinho em 5 segundos!

---

## 🔐 Primeiro Acesso, Usuários e Perfis

O sistema exige login. Na **primeira inicialização sem usuários** ele cria o administrador:

1. Depois de rodar o `atualizar_servidor.bat` (ou de iniciar o sistema), veja a senha gerada:
   ```powershell
   Select-String -Path C:\PCP-Evoluttion\servidor.log -Pattern "PRIMEIRO ACESSO" -Context 1,6
   ```
   (O `atualizar_servidor.bat` já mostra esse bloco no final.) Se preferir definir a senha antes, crie `C:\PCP-Evoluttion\backend\.env` com `PCP_ADMIN_SENHA=SuaSenha123` **antes** da primeira inicialização.
2. Abra `http://192.168.15.5:8085`, entre com login `admin` e essa senha. O sistema **obriga a troca da senha**.
3. No menu **Usuários**, crie as demais pessoas. Cada uma recebe uma senha provisória (mostrada uma vez) e troca no primeiro acesso.

| Perfil | Quem | O que pode |
|---|---|---|
| `admin` | TI | Tudo: usuários, auditoria, exclusões |
| `editor` | PCP | Criar e editar produtos, máquinas, roteiros e ordens |
| `visualizador` | Fábrica e diretoria | Somente consultar |

**5 tentativas erradas** bloqueiam o login por 5 minutos.

## ⚙️ Variáveis de Ambiente (`backend\.env`)

Arquivo opcional, **fora do git**. Modelo em `backend\.env.example`.

| Variável | Para que serve |
|---|---|
| `PCP_AMBIENTE` | `producao` desliga `/docs` e CORS (o `iniciar_servidor.bat` já define) |
| `SECRET_KEY` | Chave do login; se faltar, é gerada e gravada no `.env` |
| `PCP_ADMIN_SENHA` | Senha do admin inicial (só na primeira execução) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Duração do login (padrão 480 = 8 h) |

## 🧱 Firewall

O `instalar_servico_automatico.bat` libera a porta 8085 **somente para a faixa de rede** definida no topo do arquivo (`set FAIXA_REDE=192.168.15.0/24`; várias faixas separadas por vírgula). Para mudar a faixa, edite e rode o instalador de novo, como administrador.

## 💾 Backup e Restauração

- **Backup diário às 23:00** em `C:\PCP-Backups` (30 dias), registrando `SUCESSO` ou `FALHA` no `backup.log`. Para instalar a tarefa: `instalar_backup_diario.bat` (administrador).
- **Conferir se está funcionando:** `.\servidor_windows\verificar_backup.ps1`
- **Restaurar:** `servidor_windows\restaurar_backup.bat` (administrador). Lista os backups, pede `SIM`, para o sistema, guarda o banco atual, restaura, confere a integridade e reinicia.

## 👤 Conta de Serviço (opcional)

Para o PCP não rodar como `SYSTEM`:

```powershell
.\servidor_windows\configurar_conta_servico.ps1            # simulação
.\servidor_windows\configurar_conta_servico.ps1 -Aplicar   # aplica
```
Veja os requisitos e como desfazer em [`docs/09-seguranca-e-acesso.md`](../docs/09-seguranca-e-acesso.md).

## 🔄 Atualização com Login (resumo)

1. `schtasks /run /tn "PCP-Evoluttion-Backup"` (backup antes).
2. `servidor_windows\atualizar_servidor.bat` (mostra a senha do admin se for a primeira vez com login).
3. Ctrl+F5 nos navegadores.
