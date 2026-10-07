@echo off
REM Usado pela Tarefa Agendada: roda o servidor em segundo plano e grava log em servidor.log
cd /d "%~dp0\.."
echo [%date% %time%] Iniciando PCP... > servidor.log
call "%~dp0iniciar_servidor.bat" < nul >> servidor.log 2>&1
