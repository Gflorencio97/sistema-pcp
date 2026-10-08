# 🏭 Sistema PCP — Evoluttion

Sistema web integrado de **Planejamento e Controle da Produção (PCP)** desenvolvido sob medida para a fábrica da **Evoluttion**.

O sistema substitui planilhas manuais por uma plataforma visual e reativa, permitindo simular a viabilidade de pedidos, identificar gargalos de processo, balancear a carga das máquinas da fábrica e programar visualmente o sequenciamento de lotes em linha do tempo (Gantt).

---

## ⚡ Regras de Negócio da Fábrica

- **Jornada de Trabalho:** 1º turno = **8,8 horas úteis/dia** por máquina (valor padrão, ajustável por máquina e na tela de Carga Máquina).
- **Mês Padrão de Cálculo:** 22 dias úteis (~193,6 horas disponíveis por máquina).
- **Sequência Fixa de 6 Operações Industriais:**
  1. `USINAGEM` (Centros de Usinagem e Tornos)
  2. `FUR_INC` (Furação Incremental)
  3. `FUR_07` (Furação 0,7)
  4. `BRUNIMENTO` (Brunideiras)
  5. `ROLETAMENTO` (Roletamento)
  6. `LAV_INSP` (Lavagem e Inspeção Final)
- **Roteiro por peça:** cada produto tem uma taxa de produção (peças/hora) e uma máquina padrão para cada operação. Se for digitado um valor menor que 1, o sistema entende como horas por peça e converte para peças/hora.
- **Matéria-Prima:** Toda peça acabada possui seu respectivo `codigo_fundido` vinculado.
- **Mão de Obra Direta (MOD):** cada setor tem quantidade de operadores e jornada, para comparar a capacidade das máquinas com a disponibilidade de pessoas (Homem x Máquina).

---

## 🌐 Acesso em Produção (Servidor da Empresa)

O sistema roda 24h no Windows Server da TI. Qualquer computador na rede da empresa acessa por:

👉 **http://192.168.15.5:8085**

- Documentação da API: `http://192.168.15.5:8085/docs`
- Verificação de saúde: `http://192.168.15.5:8085/api/v1/health`
- O acesso é **somente pela rede interna** (sem login). Quem estiver em outra rede/VLAN precisa de rota liberada até o servidor na porta 8085.

Instalação inicial no servidor: veja [`servidor_windows/COMO_INSTALAR_NO_SERVIDOR.md`](servidor_windows/COMO_INSTALAR_NO_SERVIDOR.md).

### Atualizar o servidor
1. Desenvolva e teste no notebook, depois `git push`.
2. No servidor, execute `servidor_windows\atualizar_servidor.bat`.
3. Nos navegadores, atualize com **Ctrl+F5**.

> O frontend compilado (`frontend/dist`) é versionado porque o servidor não tem Node.js. **Depois de alterar o frontend, rode `npm run build` e faça commit do `dist`.** O build de produção usa a URL relativa `/api/v1` (definida em `frontend/.env.production`), então funciona em qualquer endereço.

### Banco de dados e backup
- O banco é o arquivo SQLite `backend/pcp.db`. **Ele não é versionado no git** — os dados reais ficam só no servidor.
- `backend/pcp_inicial.db` é um banco limpo (apenas máquinas e setores MOD, sem produtos, roteiros ou ordens). Para um ambiente novo, copie-o para `backend/pcp.db`.
- **Backup automático:** todo dia às 23:00, uma cópia do banco é salva em `C:\PCP-Backups` (mantém os últimos 30 dias). Para ativar, execute `servidor_windows\instalar_backup_diario.bat` como administrador. O destino e a retenção ficam em `servidor_windows\backup_banco.bat`. O registro de cada execução fica em `backup.log`.
- **Restaurar:** pare a tarefa `PCP-Evoluttion-Servidor`, copie o backup desejado sobre `backend\pcp.db` e inicie a tarefa novamente.

---

## 💻 Desenvolvimento (Notebook)

### Opção 1: Inicialização em 1 Clique
Execute o arquivo:
```cmd
iniciar_sistema.bat
```
O script abre os servidores de desenvolvimento:
- **Frontend (Interface):** [http://localhost:5173](http://localhost:5173)
- **Backend (API Docs):** [http://localhost:8000/docs](http://localhost:8000/docs)

### Opção 2: Inicialização Manual via Terminal

#### Backend (FastAPI)
```powershell
cd backend
.\venv\Scripts\activate
python -m uvicorn app.main:app --reload --port 8000
```

#### Frontend (React + Vite)
```powershell
cd frontend
npm run dev
```

No desenvolvimento, o frontend usa `frontend/.env.local` (`VITE_API_URL=http://localhost:8000/api/v1`). Esse arquivo não vai para o git.

---

## 🏛️ Tecnologias Utilizadas

- **Backend:** Python, FastAPI, SQLAlchemy 2.0, Pydantic v2, SQLite (`backend/pcp.db`)
- **Frontend:** React 19, TypeScript, Vite 8, TailwindCSS v4, TanStack Query v5, date-fns v4, Lucide React
- **Servidor:** Windows Server, Tarefa Agendada do Windows (inicia sozinho com o servidor), porta 8085

---

## 📦 Módulos Principais

1. **Central de Comando (Dashboard):** Visão executiva de ocupação da fábrica, lotes em produção, entregas dos próximos 7 dias e alertas de gargalo.
2. **Calculadora de Capacidade:** Simulação de pedidos com cálculo de horas por operação, indicação do gargalo e botão *"Lançar na Produção"*.
3. **Carga Máquina:** Balanço de horas e taxa de ocupação (%) das máquinas por setor, com alertas de capacidade e comparação Homem x Máquina (MOD).
4. **Programação Gantt:** Sequenciamento visual por máquina com detecção automática de conflito de linha e modal de reagendamento interativo.
5. **Cadastros:** Gestão de Ordens de Produção, Máquinas e Catálogo de Produtos com Editor de Roteiro Técnico.
6. **Ajuda:** Guia de uso dentro do sistema.

---

## 🗂️ Estrutura do Projeto

```
backend/            API FastAPI (routes, services, models, schemas) e banco SQLite
frontend/           Interface React (src/pages) e build de produção (dist)
servidor_windows/   Scripts de instalação, atualização e backup no Windows Server
Dockerfile, start.sh   Deploy em nuvem (Railway/Render) — não utilizado em produção
iniciar_sistema.bat    Atalho de desenvolvimento no notebook
```
