param([switch]$Demo, [switch]$Initialize, [int]$Port = 8000)
$ErrorActionPreference = 'Stop'
$backendRoot = $PSScriptRoot
$projectRoot = Split-Path (Split-Path $backendRoot -Parent) -Parent
$venvPython = Join-Path $projectRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $venvPython)) { throw 'Create the project .venv before running the backend.' }
if ($Demo) {
    $demoDatabase = Join-Path (Split-Path $backendRoot -Parent) 'storage/demo.db'
    $env:DATABASE_URL = 'sqlite:///' + $demoDatabase.Replace('\', '/')
    $env:AI_MODE = 'demo'
}
Push-Location $backendRoot
try {
    if ($Initialize) {
        & $venvPython -m app.check_setup
        if ($LASTEXITCODE -ne 0) { throw 'Backend setup check failed. Follow the instructions above.' }
        & $venvPython -m alembic upgrade head
        if ($LASTEXITCODE -ne 0) { throw 'Database migration failed.' }
        & $venvPython -m app.seed
        if ($LASTEXITCODE -ne 0) { throw 'Demo seed failed.' }
    }
    & $venvPython -m uvicorn app.main:app --host 127.0.0.1 --port $Port
} finally { Pop-Location }
