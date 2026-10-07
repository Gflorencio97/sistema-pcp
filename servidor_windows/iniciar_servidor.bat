@echo off
title PCP Evoluttion - Servidor de Producao
color 0B

echo ========================================================
echo       PCP EVOLUTTION - SERVIDOR DE PRODUCAO
echo ========================================================
echo.

cd /d "%~dp0\.."

REM Porta padrao do sistema no servidor (8000 ou 80)
set PORTA=8000

REM Detecta o IP do servidor
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "(Test-Connection -ComputerName $env:COMPUTERNAME -Count 1).IPV4Address.IPAddressToString"') do set IP_SRV=%%i
if "%IP_SRV%"=="" set IP_SRV=localhost

echo [*] Verificando ambiente Python...
if not exist "backend\venv\Scripts\python.exe" (
    echo [!] Criando ambiente virtual Python...
    python -m venv backend\venv
    call backend\venv\Scripts\activate
    pip install -r backend\requirements.txt
) else (
    call backend\venv\Scripts\activate
)

echo.
echo ========================================================
echo  PCP ONLINE NO SERVIDOR 24H!
echo.
echo  * Link para a Fabrica / Diretoria:
echo      http://%IP_SRV%:%PORTA%
echo.
echo  * Painel API / Swagger:
echo      http://%IP_SRV%:%PORTA%/docs
echo ========================================================
echo.

python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port %PORTA%
pause
