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
