@echo off
title Sistema PCP - Evoluttion
color 0A

echo ========================================================
echo        INICIANDO SISTEMA PCP - EVOLUTTION
echo ========================================================
echo.

cd /d "%~dp0"

REM Detecta o IP da maquina na rede local da empresa
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "(Test-Connection -ComputerName $env:COMPUTERNAME -Count 1).IPV4Address.IPAddressToString"') do set IP_LOCAL=%%i
if "%IP_LOCAL%"=="" set IP_LOCAL=192.168.15.153

echo [1/2] Iniciando Backend FastAPI (Porta 8000 na Rede)...
start "PCP Backend (FastAPI)" cmd /k "cd /d %~dp0backend && .\venv\Scripts\activate && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo [2/2] Iniciando Frontend React (Porta 5173 na Rede)...
start "PCP Frontend (React)" cmd /k "cd /d %~dp0frontend && npm run dev -- --host 0.0.0.0"

echo.
echo ========================================================
echo  SISTEMA PCP RODANDO COM ACESSO EM REDE!
echo.
echo  * No seu computador:
echo      Frontend: http://localhost:5173
echo      API Docs: http://localhost:8000/docs
echo.
echo  * Para outros computadores na rede da Evoluttion:
echo      Frontend: http://%IP_LOCAL%:5173
echo      API Docs: http://%IP_LOCAL%:8000/docs
echo ========================================================
echo.
echo Nao feche as janelas pretas que abriram para manter o sistema ativo.
pause
