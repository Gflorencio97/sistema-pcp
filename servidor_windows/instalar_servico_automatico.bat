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
REM Faixa de rede que pode acessar o PCP (varias faixas separadas por virgula).
REM Ex.: 192.168.15.0/24   ou   192.168.15.0/24,10.0.0.0/24
set FAIXA_REDE=192.168.15.0/24

set SCRIPT_PATH=%~dp0iniciar_em_segundo_plano.bat

echo [*] Liberando porta 8085 no Firewall do Windows Server...
netsh advfirewall firewall delete rule name="PCP Evoluttion (Porta 8085)" >nul 2>&1
netsh advfirewall firewall add rule name="PCP Evoluttion (Porta 8085)" dir=in action=allow protocol=TCP localport=8085 remoteip=%FAIXA_REDE% profile=any >nul 2>&1
echo [OK] Porta 8085 liberada no Firewall somente para %FAIXA_REDE%.

echo.
echo [*] Registrando tarefa "PCP-Evoluttion-Servidor" no Agendador do Windows...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$action = New-ScheduledTaskAction -Execute '%SCRIPT_PATH%'; $trigger = New-ScheduledTaskTrigger -AtStartup; $trigger.Delay = 'PT30S'; $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 99 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew; $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest; Register-ScheduledTask -TaskName 'PCP-Evoluttion-Servidor' -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force"

if %errorLevel% neq 0 (
    echo [!] Tentando registrar via schtasks...
    schtasks /create /tn "PCP-Evoluttion-Servidor" /tr "%SCRIPT_PATH%" /sc onstart /ru SYSTEM /rl HIGHEST /f
)

if %errorLevel% equ 0 (
    echo.
    echo ========================================================
    echo  SUCESSO! Servico configurado com sucesso!
    echo  O PCP agora inicia sozinho com o Windows Server 24h.
    echo ========================================================
    echo.
    echo Deseja iniciar o servico agora mesmo? [S/N]
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
