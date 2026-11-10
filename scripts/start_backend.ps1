$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BaseDir = Split-Path -Parent $ScriptDir
$BackendDir = Join-Path $BaseDir "backend"
$PythonExe = Join-Path $BackendDir "venv\Scripts\python.exe"

Set-Location $BackendDir
Write-Host "Starting AI Recruitment Hub FastAPI Backend on http://localhost:8000..."
& $PythonExe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

