# Confere se o backup diario do PCP esta funcionando.
# Uso (PowerShell):  .\servidor_windows\verificar_backup.ps1
# Codigo de saida: 0 = tudo certo, 1 = ha problema (serve para alertas/monitoramento).
param(
    [string]$Pasta = "C:\PCP-Backups",
    [int]$IdadeMaximaHoras = 26
)

$raiz = Split-Path -Parent $PSScriptRoot
$problemas = @()

Write-Host "=== Verificacao do backup do PCP ===" -ForegroundColor Cyan

# 1) Existe backup recente?
$arquivos = @()
if (Test-Path $Pasta) { $arquivos = Get-ChildItem -Path $Pasta -Filter "pcp_*.db" | Sort-Object LastWriteTime -Descending }
if ($arquivos.Count -eq 0) {
    $problemas += "Nenhum backup encontrado em $Pasta."
} else {
    $ultimo = $arquivos[0]
    $idade = (Get-Date) - $ultimo.LastWriteTime
    Write-Host ("Ultimo backup : {0}  ({1:N1} MB)" -f $ultimo.Name, ($ultimo.Length / 1MB))
    Write-Host ("Feito em      : {0}  (ha {1:N1} horas)" -f $ultimo.LastWriteTime, $idade.TotalHours)
    Write-Host ("Total guardado: {0} arquivo(s)" -f $arquivos.Count)
    if ($idade.TotalHours -gt $IdadeMaximaHoras) {
        $problemas += ("O ultimo backup tem {0:N0} horas (limite: {1} h)." -f $idade.TotalHours, $IdadeMaximaHoras)
    }

    # 2) A copia abre e esta integra?
    $py = Join-Path $raiz "backend\venv\Scripts\python.exe"
    if (Test-Path $py) {
        $codigo = "import sqlite3,sys; c=sqlite3.connect('file:'+sys.argv[1]+'?mode=ro',uri=True); print(c.execute('PRAGMA integrity_check').fetchone()[0])"
        $resultado = & $py -c $codigo $ultimo.FullName 2>&1
        Write-Host "Integridade   : $resultado"
        if ("$resultado".Trim() -ne "ok") { $problemas += "O ultimo backup nao passou na verificacao de integridade." }
    } else {
        Write-Host "Integridade   : (python do sistema nao encontrado, pulei esta etapa)" -ForegroundColor Yellow
    }
}

# 3) O que o backup.log diz da ultima execucao?
$log = Join-Path $raiz "backup.log"
if (Test-Path $log) {
    $linhas = Get-Content $log -Tail 200 | Where-Object { $_ -match "SUCESSO|FALHA" }
    if ($linhas) {
        $ultimaLinha = $linhas | Select-Object -Last 1
        Write-Host "Ultimo registro: $ultimaLinha"
        if ($ultimaLinha -match "FALHA") { $problemas += "O ultimo registro do backup.log indica FALHA." }
    } else {
        Write-Host "backup.log    : ainda sem registro de SUCESSO/FALHA" -ForegroundColor Yellow
    }
} else {
    Write-Host "backup.log    : nao encontrado em $log" -ForegroundColor Yellow
}

# 4) A tarefa agendada existe?
$tarefa = Get-ScheduledTask -TaskName "PCP-Evoluttion-Backup" -ErrorAction SilentlyContinue
if ($tarefa) {
    $info = Get-ScheduledTaskInfo -TaskName "PCP-Evoluttion-Backup"
    Write-Host ("Tarefa        : {0} | ultima execucao {1} | resultado {2}" -f $tarefa.State, $info.LastRunTime, $info.LastTaskResult)
    if ($info.LastTaskResult -ne 0 -and $info.LastRunTime -gt (Get-Date "2000-01-01")) { $problemas += "A tarefa PCP-Evoluttion-Backup terminou com erro (resultado $($info.LastTaskResult))." }
} else {
    $problemas += "A tarefa agendada PCP-Evoluttion-Backup nao existe. Rode instalar_backup_diario.bat como administrador."
}

Write-Host ""
if ($problemas.Count -eq 0) {
    Write-Host "RESULTADO: OK - o backup esta funcionando." -ForegroundColor Green
    exit 0
}
Write-Host "RESULTADO: ATENCAO - problemas encontrados:" -ForegroundColor Red
$problemas | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
exit 1
