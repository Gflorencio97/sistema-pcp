@echo off
title Instalar Backup Diario do PCP
color 0E

echo ========================================================
echo   AGENDAR BACKUP DIARIO DO BANCO DO PCP (23:00)
echo ========================================================
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] Execute este arquivo como ADMINISTRADOR!
    pause
    exit /b 1
)

set SCRIPT_PATH=%~dp0backup_banco.bat

echo Antes de continuar, confira o destino na linha DESTINO de:
echo   %SCRIPT_PATH%
echo.
echo Se o destino for pasta de rede (Fileserver), informe um usuario
echo com acesso a ela. Para pasta local, apenas aperte ENTER (usa SYSTEM).
echo.
set /p USUARIO=Usuario (DOMINIO\usuario) ou ENTER:

if "%USUARIO%"=="" (
    schtasks /create /tn "PCP-Evoluttion-Backup" /tr "\"%SCRIPT_PATH%\"" /sc daily /st 23:00 /ru SYSTEM /rl HIGHEST /f
) else (
    echo A senha sera solicitada a seguir.
    schtasks /create /tn "PCP-Evoluttion-Backup" /tr "\"%SCRIPT_PATH%\"" /sc daily /st 23:00 /ru "%USUARIO%" /rp * /rl HIGHEST /f
)

if %errorLevel% equ 0 (
    echo.
    echo [OK] Backup diario agendado para 23:00.
    echo Para testar agora: schtasks /run /tn "PCP-Evoluttion-Backup"
    echo Log: backup.log na pasta raiz do projeto.
) else (
    echo [FALHA] Nao foi possivel criar a tarefa agendada.
)
pause
