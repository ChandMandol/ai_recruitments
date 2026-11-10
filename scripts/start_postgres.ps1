$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BaseDir = Split-Path -Parent $ScriptDir
$PgBin = Join-Path $BaseDir "pgsql\pgsql\bin"
$PgData = Join-Path $BaseDir "pgsql\data"
$PgLog = Join-Path $BaseDir "pgsql\logfile.log"

Write-Host "Starting PostgreSQL Server..."
& "$PgBin\pg_ctl.exe" -D $PgData -l $PgLog start
Start-Sleep -Seconds 2
& "$PgBin\pg_ctl.exe" -D $PgData status

