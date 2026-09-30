# 🏭 Sistema PCP — Evoluttion

Sistema web integrado de **Planejamento e Controle da Produção (PCP)** desenvolvido sob medida para a fábrica da **Evoluttion**.

O sistema substitui planilhas manuais por uma plataforma visual e reativa, permitindo simular a viabilidade de pedidos, identificar gargalos de processo, balancear a carga das 25 máquinas da fábrica e programar visualmente o sequenciamento de lotes em linha do tempo (Gantt).

---

## ⚡ Regras de Negócio da Fábrica

- **Jornada de Trabalho:** 2 turnos diários = **17,15 horas úteis/dia** por máquina.
- **Mês Padrão de Cálculo:** 22 dias úteis (~377,3 horas disponíveis por máquina).
- **Sequência Fixa de 6 Operações Industriais:**
  1. `USINAGEM` (Centros de Usinagem e Tornos - Linhas 1 a 10)
  2. `FUR_INC` (Furação Inclinada)
  3. `FUR_07` (Furação 07)
  4. `BRUNIMENTO` (Brunideiras 1 a 4)
  5. `ROLETAMENTO` (Roletamento 1 a 4)
  6. `LAV_INSP` (Lavagem e Inspeção Final)
- **Matéria-Prima:** Toda peça acabada possui seu respectivo `codigo_fundido` vinculado.

---

## 🚀 Como Iniciar o Sistema (Windows)

### Opção 1: Inicialização em 1 Clique (Recomendado)
Dê um duplo clique no atalho **`Sistema PCP Evoluttion`** na Área de Trabalho ou execute o arquivo:
```cmd
iniciar_sistema.bat
```
O script abrirá os servidores automaticamente:
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

---

## 🏛️ Tecnologias Utilizadas

- **Backend:** Python 3.14, FastAPI, SQLAlchemy 2.0, Pydantic v2, SQLite (`backend/pcp.db`)
- **Frontend:** React 19, TypeScript, Vite 8, TailwindCSS v4, TanStack Query v5, date-fns v4, Lucide React

---

## 📦 Módulos Principais

1. **Central de Comando (Dashboard):** Visão executiva de ocupação da fábrica, lotes em produção, entregas dos próximos 7 dias e alertas de gargalo.
2. **Calculadora de Capacidade:** Simulação de pedidos com cálculo de horas por operação, indicação do gargalo e botão *"Lançar na Produção"*.
3. **Carga Máquina:** Balanço de horas e taxa de ocupação (%) para as 25 máquinas organizadas por setor com alertas de capacidade.
4. **Programação Gantt:** Sequenciamento visual por máquina com detecção automática de conflito de linha e modal de reagendamento interativo.
5. **Cadastros:** Gestão de Ordens de Produção, Máquinas e Catálogo de Produtos com Editor de Roteiro Técnico.
