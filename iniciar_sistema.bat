@echo off
title Sistema PCP - Evoluttion
color 0A

echo ========================================================
echo        INICIANDO SISTEMA PCP - EVOLUTTION
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Iniciando Backend FastAPI (Porta 8000)...
start "PCP Backend (FastAPI)" cmd /k "cd /d %~dp0backend && .\venv\Scripts\activate && python -m uvicorn app.main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo [2/2] Iniciando Frontend React (Porta 5173)...
start "PCP Frontend (React)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================================
echo  Sistema rodando!
echo  - Frontend: http://localhost:5173
echo  - API Docs: http://localhost:8000/docs
echo ========================================================
echo.
echo Nao feche as janelas pretas que abriram para manter o sistema ativo.
pause
