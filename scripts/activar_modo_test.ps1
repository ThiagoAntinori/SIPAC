# Activa el modo de testing local seguro en SITRAC
$envFile = Join-Path $PSScriptRoot "..\\.env"

if (-not (Test-Path $envFile)) {
    Write-Host "No se encontro el archivo .env" -ForegroundColor Red
    exit 1
}

$content = Get-Content $envFile -Raw
if ($content -match "USE_TEST_DB=") {
    $content = $content -replace "USE_TEST_DB=\w+", "USE_TEST_DB=true"
} else {
    $content = "USE_TEST_DB=true`n" + $content
}

Set-Content -Path $envFile -Value $content -NoNewline

$dbTest = Join-Path $PSScriptRoot "..\\sitrac_test.db"
if (-not (Test-Path $dbTest)) {
    Write-Host "Clonando base de datos de produccion a sitrac_test.db..." -ForegroundColor Cyan
    python (Join-Path $PSScriptRoot "clonar_bd_a_test.py")
}

Write-Host "====================================================================" -ForegroundColor Green
Write-Host " [MODO TESTING ACTIVADO]" -ForegroundColor Green
Write-Host " La API utilizara 'sitrac_test.db' (SQLite local)." -ForegroundColor Yellow
Write-Host " La base de datos Turso Cloud de PRODUCCION queda 100% PROTEGIDA." -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Green

