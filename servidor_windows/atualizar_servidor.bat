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
echo [*] Aguardando o sistema iniciar...
timeout /t 20 /nobreak >nul
REM Primeira vez com login: o sistema cria o usuario admin e escreve a senha UMA vez no servidor.log
powershell -NoProfile -Command "if (Test-Path 'servidor.log') { $r = Select-String -Path 'servidor.log' -Pattern 'PRIMEIRO ACESSO' -Context 1,6 | Select-Object -Last 1; if ($r) { Write-Host ''; Write-Host '>>> PRIMEIRO ACESSO: anote o login e a senha abaixo (aparecem so uma vez):' -ForegroundColor Yellow; $r.Context.PreContext + $r.Line + $r.Context.PostContext | ForEach-Object { Write-Host $_ } } }"

echo.
echo ========================================================
echo  PCP ATUALIZADO COM SUCESSO NO SERVIDOR!
echo ========================================================
pause
