# 07 — Operação do servidor

Runbook para quem administra o Windows Server da TI.

| Item | Valor |
|---|---|
| Pasta do sistema | `C:\PCP-Evoluttion` |
| Endereço | `http://192.168.15.5:8085` |
| Porta | 8085 (liberada no firewall pelo instalador) |
| Tarefa do sistema | `PCP-Evoluttion-Servidor` (30 s depois do boot, usuário SYSTEM, **sem limite de tempo** e com reinício automático) |
| Tarefa de backup | `PCP-Evoluttion-Backup` (todo dia, 23:00) |
| Banco | `C:\PCP-Evoluttion\backend\pcp.db` |
| Backups | `C:\PCP-Backups` (30 dias) |
| Logs | `servidor.log` e `backup.log`, na pasta do sistema |
| Repositório | https://github.com/Gflorencio97/sistema-pcp (branch `main`) |

Os comandos abaixo devem ser executados no **PowerShell como administrador**.

## Pré-requisitos

- Git for Windows.
- Python 3.10 ou superior, com **"Add Python to PATH"** marcado.

## Instalação (servidor novo)

1. Clonar o repositório:
   ```powershell
   cd C:\
   git clone https://github.com/Gflorencio97/sistema-pcp.git PCP-Evoluttion
   ```
2. Criar o banco inicial (só máquinas e MOD):
   ```powershell
   cd C:\PCP-Evoluttion
   Copy-Item backend\pcp_inicial.db backend\pcp.db
   ```
3. Executar `servidor_windows\instalar_servico_automatico.bat` **como administrador**. Ele libera a porta 8085 e registra a tarefa `PCP-Evoluttion-Servidor`.
4. Executar `servidor_windows\instalar_backup_diario.bat` **como administrador** (ENTER no usuário usa SYSTEM e pasta local).
5. Testar: abrir `http://IP-DO-SERVIDOR:8085/api/v1/health` (deve responder `{"status":"ok"}`).

O primeiro início cria o ambiente virtual Python e instala as dependências, e pode demorar alguns minutos.

## Atualização

1. **Backup antes:**
   ```powershell
   schtasks /run /tn "PCP-Evoluttion-Backup"
   ```
   Confira se apareceu um arquivo novo em `C:\PCP-Backups` e `[OK]` no `backup.log`.
2. Executar `servidor_windows\atualizar_servidor.bat` (baixa do GitHub, atualiza dependências e reinicia a tarefa).
3. Nos navegadores, **Ctrl+F5**.
4. Conferir: `http://192.168.15.5:8085/api/v1/health` e abrir o Gantt.

Quando a versão trouxer migração de dados, o sistema cria sozinho `backend\pcp_antes_migracao_AAAAMMDD_HHMMSS.db` antes de alterar. Pode ser apagado depois da conferência.

## Backup

- **Automático:** `servidor_windows\backup_banco.bat` roda todo dia às 23:00. Usa a API de backup do SQLite (segura com o sistema rodando), confere a integridade e apaga cópias com mais de 30 dias. Os arquivos se chamam `pcp_AAAA-MM-DD_HHMMSS.db`.
- **Destino e retenção:** variáveis `DESTINO` e `DIAS_RETENCAO` no topo de `backup_banco.bat`.
- **Manual:** `schtasks /run /tn "PCP-Evoluttion-Backup"`.

> O destino padrão está no mesmo disco do banco. Para proteger contra falha de disco, aponte `DESTINO` para outro disco ou compartilhamento (e rode a tarefa com um usuário que tenha acesso a ele).

## Restauração

1. Parar o sistema:
   ```powershell
   schtasks /end /tn "PCP-Evoluttion-Servidor"
   ```
2. Guardar o banco atual e restaurar o backup escolhido:
   ```powershell
   cd C:\PCP-Evoluttion\backend
   Move-Item pcp.db pcp_antes_restauracao.db
   Copy-Item C:\PCP-Backups\pcp_AAAA-MM-DD_HHMMSS.db pcp.db
   ```
3. Iniciar:
   ```powershell
   schtasks /run /tn "PCP-Evoluttion-Servidor"
   ```
4. Testar o `/api/v1/health` e abrir o Gantt.

## Iniciar, parar e verificar

```powershell
schtasks /run /tn "PCP-Evoluttion-Servidor"     # iniciar
schtasks /end /tn "PCP-Evoluttion-Servidor"     # parar
Get-NetTCPConnection -LocalPort 8085 -State Listen   # está escutando?
schtasks /query /tn "PCP-Evoluttion-Servidor" /v /fo list   # estado e último resultado
```

Para ver o erro de inicialização, rode manualmente `servidor_windows\iniciar_servidor.bat` e leia a tela.

## Verificar a tarefa agendada

```powershell
$t = Get-ScheduledTask -TaskName "PCP-Evoluttion-Servidor"
$t.Settings | Select-Object ExecutionTimeLimit, RestartCount
$t.Actions[0].Execute
Get-Content C:\PCP-Evoluttion\servidor.log -Tail 8
```

Esperado: `ExecutionTimeLimit` = `PT0S`, `RestartCount` = `99`, ação terminando em `iniciar_em_segundo_plano.bat` e o log mostrando o Uvicorn na porta 8085.

Como funciona: a tarefa roda `servidor_windows\iniciar_em_segundo_plano.bat`, que mantém o PCP em um laço. Se o processo cair, ele é reiniciado em 15 segundos, e tudo é gravado em `servidor.log` (guardado como `servidor.antigo.log` ao passar de ~20 MB).

> **Atenção:** tarefas criadas por versões antigas do instalador tinham limite de 72 h e nenhum reinício, e o PCP parava sozinho depois de 3 dias. Se `ExecutionTimeLimit` aparecer como `PT72H`, recrie a tarefa executando `instalar_servico_automatico.bat` como administrador.

## Problemas conhecidos e soluções

| Sintoma | Causa provável | Solução |
|---|---|---|
| "Erro ao conectar com a API" ao abrir a tela, em outros PCs | Bundle compilado com `localhost` | Garantir `frontend/.env.production` com `VITE_API_URL=/api/v1`, `npm run build` e commitar o `dist`. |
| Outro PC não abre o link | Rede/VLAN diferente, proxy do navegador, firewall | `Test-NetConnection 192.168.15.5 -Port 8085` no PC; checar proxy e a regra do firewall. |
| `git pull` falha com "Rename ... main.lock failed" | Antivírus ou outro Git segurando o arquivo | Encerrar processos `git`, apagar `.git\refs\remotes\origin\main.lock`, excluir a pasta do antivírus e repetir. |
| O PCP parou sozinho depois de alguns dias | Tarefa criada pela versão antiga do instalador (limite de 72 h, sem reinício) | Subir com `schtasks /run /tn "PCP-Evoluttion-Servidor"` e recriar a tarefa com `instalar_servico_automatico.bat` (veja "Verificar a tarefa agendada"). |
| Porta 8085 em uso | Outro serviço na porta | Descobrir com `Get-NetTCPConnection -LocalPort 8085` e ajustar a porta em `iniciar_servidor.bat`, na regra do firewall e nos atalhos. |
| Peça nova "não salva" | Mensagem de erro genérica na tela | Ver a resposta real em F12 → Rede (400 duplicado, 422 validação, 500 servidor). |

## Pendências de operação

- **Backup externo:** mover o destino do backup para fora do disco do servidor.
- **IP fixo:** pedir à TI de rede reserva de IP para `192.168.15.5`, para o link não mudar.
