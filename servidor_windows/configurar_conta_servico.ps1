<#
.SYNOPSIS
  Faz o PCP rodar com uma conta de servico local SEM privilegio de administrador (em vez de SYSTEM).

.DESCRIPTION
  Sem -Aplicar o script so MOSTRA o que faria (simulacao). Com -Aplicar ele:
    1. confere se o Python do sistema esta fora de um perfil de usuario;
    2. cria a conta local (padrao svc_pcp), sem ser administradora, com senha aleatoria que nao expira;
    3. impede essa conta de entrar no Windows de forma interativa ou por area de trabalho remota;
    4. libera "Fazer logon como tarefa em lotes" para ela;
    5. da permissao de leitura e escrita SOMENTE em C:\PCP-Evoluttion e C:\PCP-Backups;
    6. recria as tarefas PCP-Evoluttion-Servidor e PCP-Evoluttion-Backup rodando com essa conta;
    7. reinicia o sistema e confere o /api/v1/health.

  Para desfazer: execute instalar_servico_automatico.bat e instalar_backup_diario.bat como administrador
  (voltam a usar SYSTEM) e, se quiser, remova a conta:  Remove-LocalUser svc_pcp

  Execute no PowerShell COMO ADMINISTRADOR, no servidor:
    .\servidor_windows\configurar_conta_servico.ps1            (simulacao)
    .\servidor_windows\configurar_conta_servico.ps1 -Aplicar   (aplica)
#>
param(
    [string]$Conta = "svc_pcp",
    [string]$PastaSistema = "C:\PCP-Evoluttion",
    [string]$PastaBackup = "C:\PCP-Backups",
    [int]$Porta = 8085,
    [switch]$Aplicar
)

$ErrorActionPreference = "Stop"

function Passo($texto) { Write-Host ""; Write-Host "== $texto" -ForegroundColor Cyan }
function Agir($descricao, [scriptblock]$acao) {
    if ($Aplicar) { Write-Host "  [fazendo] $descricao"; & $acao }
    else { Write-Host "  [simulacao] $descricao" -ForegroundColor DarkGray }
}

# --- precisa ser administrador ---
$ehAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $ehAdmin) { Write-Host "Execute este script no PowerShell COMO ADMINISTRADOR." -ForegroundColor Red; exit 1 }
if (-not (Test-Path $PastaSistema)) { Write-Host "Pasta do sistema nao encontrada: $PastaSistema" -ForegroundColor Red; exit 1 }

if ($Aplicar) { Write-Host "MODO APLICAR: as alteracoes serao feitas." -ForegroundColor Yellow }
else { Write-Host "MODO SIMULACAO: nada sera alterado. Use -Aplicar para executar." -ForegroundColor Yellow }

# --- 1) o Python nao pode estar dentro do perfil de um usuario ---
Passo "1/7 Conferindo onde o Python esta instalado"
$cfg = Join-Path $PastaSistema "backend\venv\pyvenv.cfg"
if (-not (Test-Path $cfg)) { Write-Host "  venv nao encontrado em $cfg. Rode o sistema uma vez antes." -ForegroundColor Red; exit 1 }
$homePy = ((Get-Content $cfg | Where-Object { $_ -match '^\s*home\s*=' }) -replace '^\s*home\s*=\s*', '').Trim()
Write-Host "  Python base: $homePy"
if ($homePy -like "C:\Users\*" -or $homePy -like "$env:USERPROFILE*") {
    Write-Host "  O Python esta instalado dentro de um perfil de usuario. A conta de servico nao conseguiria usa-lo." -ForegroundColor Red
    Write-Host "  Instale o Python para todos os usuarios (C:\Program Files\Python3x), recrie backend\venv e rode este script de novo." -ForegroundColor Red
    exit 1
}

# --- 2) conta local ---
Passo "2/7 Conta local '$Conta' (sem privilegio de administrador)"
$senhaPlano = $null
$existe = Get-LocalUser -Name $Conta -ErrorAction SilentlyContinue
if ($existe) {
    Write-Host "  A conta ja existe."
    if ($Aplicar) {
        $seg = Read-Host "  Informe a senha ATUAL da conta $Conta (necessaria para registrar as tarefas)" -AsSecureString
        $senhaPlano = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($seg))
    }
} else {
    Agir "criar a conta $Conta com senha aleatoria (nao expira, nao pode ser trocada pelo usuario)" {
        $chars = ([char[]]'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!#%+=')
        $script:senhaPlano = -join (1..24 | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
        $segura = ConvertTo-SecureString $script:senhaPlano -AsPlainText -Force
        New-LocalUser -Name $Conta -Password $segura -PasswordNeverExpires -UserMayNotChangePassword -AccountNeverExpires `
            -Description "Conta de servico do PCP (sem privilegios de administrador)" | Out-Null
    }
}
Agir "colocar $Conta somente no grupo Usuarios e garantir que NAO e administradora" {
    $usuarios = Get-LocalGroup -SID "S-1-5-32-545"
    $admins = Get-LocalGroup -SID "S-1-5-32-544"
    if (-not (Get-LocalGroupMember -Group $usuarios -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*\$Conta" })) {
        Add-LocalGroupMember -Group $usuarios -Member $Conta
    }
    if (Get-LocalGroupMember -Group $admins -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*\$Conta" }) {
        Remove-LocalGroupMember -Group $admins -Member $Conta
    }
}

# --- 3 e 4) direitos de logon ---
function Definir-DireitoDeUsuario([string]$direito, [string]$sid) {
    $base = Join-Path $env:TEMP ("pcp_sec_" + [guid]::NewGuid().ToString("N"))
    secedit /export /cfg "$base.inf" /areas USER_RIGHTS | Out-Null
    $atual = (Get-Content "$base.inf" -Encoding Unicode | Where-Object { $_ -match "^$direito\s*=" } | Select-Object -First 1)
    $valores = @()
    if ($atual) { $valores = (($atual -split "=", 2)[1]).Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ } }
    if ($valores -notcontains "*$sid") { $valores += "*$sid" }
    $conteudo = "[Unicode]`r`nUnicode=yes`r`n[Version]`r`nsignature=`"`$CHICAGO`$`"`r`nRevision=1`r`n[Privilege Rights]`r`n$direito = " + ($valores -join ",") + "`r`n"
    Set-Content -Path "$base.novo.inf" -Value $conteudo -Encoding Unicode
    secedit /configure /db "$base.sdb" /cfg "$base.novo.inf" /areas USER_RIGHTS /quiet | Out-Null
    Remove-Item "$base.*" -Force -ErrorAction SilentlyContinue
}
Passo "3/7 Impedindo logon interativo e por area de trabalho remota"
Agir "negar SeDenyInteractiveLogonRight e SeDenyRemoteInteractiveLogonRight para $Conta" {
    $sid = (New-Object Security.Principal.NTAccount($Conta)).Translate([Security.Principal.SecurityIdentifier]).Value
    Definir-DireitoDeUsuario "SeDenyInteractiveLogonRight" $sid
    Definir-DireitoDeUsuario "SeDenyRemoteInteractiveLogonRight" $sid
}
Passo "4/7 Liberando 'Fazer logon como tarefa em lotes' (necessario para tarefas agendadas)"
Agir "conceder SeBatchLogonRight para $Conta" {
    $sid = (New-Object Security.Principal.NTAccount($Conta)).Translate([Security.Principal.SecurityIdentifier]).Value
    Definir-DireitoDeUsuario "SeBatchLogonRight" $sid
}

# --- 5) permissoes de pasta ---
Passo "5/7 Permissoes de pasta (somente o necessario)"
Agir "leitura e escrita para $Conta em $PastaSistema" { icacls $PastaSistema /grant "${Conta}:(OI)(CI)M" /T /C /Q | Out-Null }
Agir "criar $PastaBackup (se nao existir) e dar leitura e escrita para $Conta" {
    if (-not (Test-Path $PastaBackup)) { New-Item -ItemType Directory -Path $PastaBackup | Out-Null }
    icacls $PastaBackup /grant "${Conta}:(OI)(CI)M" /T /C /Q | Out-Null
}

# --- 6) tarefas agendadas ---
Passo "6/7 Recriando as tarefas agendadas com a conta $Conta"
Agir "parar o sistema atual" {
    schtasks /end /tn "PCP-Evoluttion-Servidor" 2>$null | Out-Null
    Get-NetTCPConnection -LocalPort $Porta -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 3
}
Agir "registrar PCP-Evoluttion-Servidor (ao iniciar o Windows, sem limite de tempo, com reinicio automatico)" {
    $usuarioTarefa = "$env:COMPUTERNAME\$Conta"
    $acao = New-ScheduledTaskAction -Execute (Join-Path $PastaSistema "servidor_windows\iniciar_em_segundo_plano.bat")
    $gatilho = New-ScheduledTaskTrigger -AtStartup
    $gatilho.Delay = "PT30S"
    $config = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 99 -RestartInterval (New-TimeSpan -Minutes 1) `
        -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
    Register-ScheduledTask -TaskName "PCP-Evoluttion-Servidor" -Action $acao -Trigger $gatilho -Settings $config `
        -User $usuarioTarefa -Password $script:senhaPlano -RunLevel Limited -Force | Out-Null
}
Agir "registrar PCP-Evoluttion-Backup (todo dia as 23:00)" {
    $usuarioTarefa = "$env:COMPUTERNAME\$Conta"
    $acao = New-ScheduledTaskAction -Execute (Join-Path $PastaSistema "servidor_windows\backup_banco.bat")
    $gatilho = New-ScheduledTaskTrigger -Daily -At "23:00"
    $config = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    Register-ScheduledTask -TaskName "PCP-Evoluttion-Backup" -Action $acao -Trigger $gatilho -Settings $config `
        -User $usuarioTarefa -Password $script:senhaPlano -RunLevel Limited -Force | Out-Null
}

# --- 7) subir e conferir ---
Passo "7/7 Iniciando e conferindo"
Agir "iniciar o sistema e testar http://localhost:$Porta/api/v1/health" {
    schtasks /run /tn "PCP-Evoluttion-Servidor" | Out-Null
    $ok = $false
    foreach ($i in 1..12) {
        Start-Sleep -Seconds 5
        try { if ((Invoke-RestMethod "http://localhost:$Porta/api/v1/health").status -eq "ok") { $ok = $true; break } } catch { }
    }
    if ($ok) { Write-Host "  SISTEMA NO AR rodando como $Conta." -ForegroundColor Green }
    else {
        Write-Host "  O sistema nao respondeu em 1 minuto. Veja $PastaSistema\servidor.log." -ForegroundColor Red
        Write-Host "  Para voltar ao SYSTEM: execute instalar_servico_automatico.bat e instalar_backup_diario.bat como administrador." -ForegroundColor Red
    }
}

Write-Host ""
if ($Aplicar -and $script:senhaPlano -and -not $existe) {
    Write-Host "SENHA DA CONTA $Conta (aparece so agora; guarde no cofre de senhas da TI):" -ForegroundColor Yellow
    Write-Host "  $script:senhaPlano" -ForegroundColor Yellow
    Write-Host "Se a senha for trocada depois, as tarefas precisam ser registradas de novo com a nova senha."
}
if (-not $Aplicar) { Write-Host "Simulacao concluida. Para executar de verdade: .\servidor_windows\configurar_conta_servico.ps1 -Aplicar" -ForegroundColor Yellow }
