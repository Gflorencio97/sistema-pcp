@echo off
title Atualizar PCP Evoluttion no Servidor
color 0A

echo ========================================================
echo        ATUALIZANDO PCP EVOLUTTION NO SERVIDOR
echo ========================================================
echo.

cd /d "%~dp0\.."

echo [1/3] Baixando ultimas atualizacoes do GitHub...
git pull origin main

echo.
echo [2/3] Verificando dependencias do Python...
call backend\venv\Scripts\activate
pip install -r backend\requirements.txt --quiet

echo.
echo [3/3] Reiniciando o servico...
schtasks /end /tn "PCP-Evoluttion-Servidor" >nul 2>&1
timeout /t 2 /nobreak >nul
schtasks /run /tn "PCP-Evoluttion-Servidor" >nul 2>&1

echo.
echo ========================================================
echo  PCP ATUALIZADO COM SUCESSO NO SERVIDOR!
echo ========================================================
pause
