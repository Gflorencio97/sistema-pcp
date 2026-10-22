@echo off
setlocal EnableDelayedExpansion
title Restaurar backup do PCP
color 0E

REM ========================================================
REM  RESTAURAR BACKUP DO BANCO DO PCP
REM  Lista os backups, pede confirmacao, para o sistema,
REM  guarda o banco atual, restaura o escolhido e reinicia.
REM ========================================================

REM Pasta dos backups (a mesma DESTINO do backup_banco.bat)
set DESTINO=C:\PCP-Backups
set TAREFA=PCP-Evoluttion-Servidor
set PORTA=8085

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] Execute este arquivo como ADMINISTRADOR.
    pause
    exit /b 1
)

cd /d "%~dp0\.."

if not exist "%DESTINO%\pcp_*.db" (
    echo [ERRO] Nenhum backup encontrado em %DESTINO%.
    pause
    exit /b 1
)

echo.
echo Backups disponiveis em %DESTINO% (do mais recente para o mais antigo):
echo.
set N=0
for /f "delims=" %%F in ('dir /b /o-n "%DESTINO%\pcp_*.db"') do (
    set /a N+=1
    set "ARQ!N!=%%F"
    echo   !N!. %%F
)
echo.
set ESC=
set /p ESC=Digite o NUMERO do backup que deseja restaurar (ENTER cancela):
if "%ESC%"=="" goto cancelado

set "ESCOLHIDO="
set "ESCOLHIDO=!ARQ%ESC%!"
if "%ESCOLHIDO%"=="" (
    echo [ERRO] Numero invalido.
    pause
    exit /b 1
)

echo.
echo Vai restaurar: %ESCOLHIDO%
echo O banco atual sera guardado antes em backend\pcp_antes_restauracao_*.db
echo O sistema ficara FORA DO AR por alguns segundos.
echo.
set CONF=
set /p CONF=Para continuar digite SIM e ENTER:
if /i not "%CONF%"=="SIM" goto cancelado

echo.
echo [1/5] Parando o sistema...
schtasks /end /tn "%TAREFA%" >nul 2>&1
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort %PORTA% -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"
timeout /t 3 /nobreak >nul

echo [2/5] Guardando o banco atual...
for /f %%D in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set CARIMBO=%%D
set GUARDADO=backend\pcp_antes_restauracao_%CARIMBO%.db
copy /y "backend\pcp.db" "%GUARDADO%" >nul
if errorlevel 1 (
    echo [ERRO] Nao foi possivel guardar o banco atual. Nada foi alterado.
    schtasks /run /tn "%TAREFA%" >nul 2>&1
    pause
    exit /b 1
)

echo [3/5] Restaurando o backup escolhido...
copy /y "%DESTINO%\%ESCOLHIDO%" "backend\pcp.db" >nul
if errorlevel 1 goto desfazer
if exist "backend\pcp.db-wal" del /q "backend\pcp.db-wal"
if exist "backend\pcp.db-shm" del /q "backend\pcp.db-shm"

echo [4/5] Conferindo a integridade do banco restaurado...
backend\venv\Scripts\python.exe -c "import sqlite3,sys; c=sqlite3.connect('backend/pcp.db'); r=c.execute('PRAGMA integrity_check').fetchone()[0]; print('integridade:', r); sys.exit(0 if r=='ok' else 1)"
if errorlevel 1 goto desfazer

echo [5/5] Iniciando o sistema...
schtasks /run /tn "%TAREFA%" >nul 2>&1

echo.
echo ========================================================
echo  BACKUP RESTAURADO: %ESCOLHIDO%
echo  O banco anterior ficou em: %GUARDADO%
echo  Aguarde uns 30 segundos e confira o sistema no navegador.
echo ========================================================
pause
exit /b 0

:desfazer
echo.
echo [ERRO] A restauracao falhou. Voltando o banco anterior...
copy /y "%GUARDADO%" "backend\pcp.db" >nul
schtasks /run /tn "%TAREFA%" >nul 2>&1
echo O banco anterior foi recolocado e o sistema reiniciado.
pause
exit /b 1

:cancelado
echo.
echo Cancelado. Nada foi alterado.
pause
exit /b 0
