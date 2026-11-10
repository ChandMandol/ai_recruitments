$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BaseDir = Split-Path -Parent $ScriptDir
$FrontendDir = Join-Path $BaseDir "frontend"

Set-Location $FrontendDir
Write-Host "Starting AI Recruitment Hub React Frontend on http://localhost:3000..."
npm run dev

