@echo off
REM Usado pela Tarefa Agendada "PCP-Evoluttion-Servidor".
REM Roda o PCP em segundo plano, grava tudo em servidor.log e REINICIA sozinho se o processo cair.
cd /d "%~dp0\.."

:inicio
REM Guarda o log antigo quando passa de ~20 MB
for %%F in (servidor.log) do if %%~zF GTR 20000000 move /y servidor.log servidor.antigo.log >nul 2>&1

echo [%date% %time%] Iniciando PCP... >> servidor.log
call "%~dp0iniciar_servidor.bat" < nul >> servidor.log 2>&1
echo [%date% %time%] PCP encerrou (codigo %errorlevel%). Reiniciando em 15 segundos... >> servidor.log

REM Espera 15 segundos (ping local serve de "sleep" sem precisar de teclado)
ping -n 16 127.0.0.1 > nul
goto inicio
