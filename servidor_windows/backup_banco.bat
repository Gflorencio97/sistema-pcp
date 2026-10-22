@echo off
REM Backup diario do banco do PCP (chamado pela tarefa agendada "PCP-Evoluttion-Backup")
REM Para trocar o destino, edite SOMENTE a linha DESTINO abaixo.
REM Se for uma pasta de rede, a tarefa precisa rodar com um usuario que tenha acesso a ela.

set DESTINO=C:\PCP-Backups
set DIAS_RETENCAO=30

cd /d "%~dp0\.."
echo [%date% %time%] Iniciando backup... >> backup.log
call backend\venv\Scripts\activate
python servidor_windows\backup_banco.py backend\pcp.db "%DESTINO%" %DIAS_RETENCAO% >> backup.log 2>&1
if errorlevel 1 goto falhou
echo [%date% %time%] SUCESSO: backup concluido. >> backup.log
exit /b 0

:falhou
echo [%date% %time%] FALHA: o backup NAO foi concluido. Veja as linhas acima. >> backup.log
exit /b 1
