@echo off
title Instalar PCP como Servico Automatico no Windows Server
color 0E

echo ========================================================
echo   CONFIGURAR PCP PARA INICIAR SOZINHO COM O WINDOWS
echo ========================================================
echo.
echo Este script cria uma Tarefa Agendada no Windows Server
echo para que o Sistema PCP suba automaticamente ao ligar/reiniciar,
echo sem precisar de login de usuario.
echo.

REM Verifica permissoes de Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] Execute este arquivo como ADMINISTRADOR!
    echo Clique com o botao direito e selecione "Executar como Administrador".
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0"
set SCRIPT_PATH=%~dp0iniciar_servidor.bat

echo [*] Liberando porta 8000 no Firewall do Windows Server...
netsh advfirewall firewall delete rule name="PCP Evoluttion (Porta 8000)" >nul 2>&1
netsh advfirewall firewall add rule name="PCP Evoluttion (Porta 8000)" dir=in action=allow protocol=TCP localport=8000 profile=any >nul 2>&1
echo [OK] Porta 8000 liberada no Firewall para a rede interna.

echo.
echo [*] Registrando tarefa "PCP-Evoluttion-Servidor" no Agendador do Windows...
schtasks /create /tn "PCP-Evoluttion-Servidor" /tr "\"%SCRIPT_PATH%\"" /sc onstart /ru SYSTEM /rl HIGHEST /f

if %errorLevel% equ 0 (
    echo.
    echo ========================================================
    echo  SUCESSO! Servico configurado com sucesso!
    echo  O PCP agora inicia sozinho com o Windows Server 24h.
    echo ========================================================
    echo.
    echo Deseja iniciar o servico agora mesmo? (S/N)
    set /p RESPOSTA=Opcao: 
    if /i "%RESPOSTA%"=="S" (
        echo [*] Iniciando servico...
        schtasks /run /tn "PCP-Evoluttion-Servidor"
        echo [OK] Servico disparado em segundo plano.
    )
) else (
    echo.
    echo [FALHA] Nao foi possivel criar a tarefa agendada.
)

pause
