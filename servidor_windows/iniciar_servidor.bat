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
    echo [!] Procurando Python no sistema...
    set "PYTHON_CMD="
    
    REM Teste 1: Comando python padrao
    python --version >nul 2>&1 && set "PYTHON_CMD=python"
    
    REM Teste 2: Launcher py
    if not defined PYTHON_CMD (
        py --version >nul 2>&1 && set "PYTHON_CMD=py"
    )
    
    REM Teste 3: Pastas padrao em Program Files
    if not defined PYTHON_CMD (
        for /d %%d in ("C:\Program Files\Python3*") do (
            if exist "%%d\python.exe" set "PYTHON_CMD=%%d\python.exe"
        )
    )
    
    REM Teste 4: Pastas padrao em LocalAppData (instalacao por usuario)
    if not defined PYTHON_CMD (
        for /d %%d in ("%LOCALAPPDATA%\Programs\Python\Python3*") do (
            if exist "%%d\python.exe" set "PYTHON_CMD=%%d\python.exe"
        )
    )

    REM Teste 5: C:\Python3*
    if not defined PYTHON_CMD (
        for /d %%d in ("C:\Python3*") do (
            if exist "%%d\python.exe" set "PYTHON_CMD=%%d\python.exe"
        )
    )
    
    if not defined PYTHON_CMD (
        echo.
        echo ========================================================
        echo [ERRO] PYTHON NAO ENCONTRADO NO WINDOWS SERVER!
        echo.
        echo O Python ainda nao esta instalado ou nao foi adicionado ao PATH.
        echo.
        echo O que fazer:
        echo 1. Baixe o instalador do Python em: https://www.python.org/downloads/
        echo 2. Execute o instalador e MARQUE a opcao:
        echo    [X] "Add python.exe to PATH" (ou "Add Python to PATH")
        echo 3. Conclua a instalacao e execute este script novamente.
        echo ========================================================
        echo.
        pause
        exit /b 1
    )

    echo [!] Python localizado: %PYTHON_CMD%
    echo [!] Criando ambiente virtual Python (backend\venv)...
    "%PYTHON_CMD%" -m venv backend\venv
    call backend\venv\Scripts\activate
    echo [*] Instalando dependencias do backend...
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
