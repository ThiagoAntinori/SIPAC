# Vuelve al modo de produccion (Turso Cloud) en SITRAC
$envFile = Join-Path $PSScriptRoot "..\\.env"

if (-not (Test-Path $envFile)) {
    Write-Host "No se encontro el archivo .env" -ForegroundColor Red
    exit 1
}

$content = Get-Content $envFile -Raw
if ($content -match "USE_TEST_DB=") {
    $content = $content -replace "USE_TEST_DB=\w+", "USE_TEST_DB=false"
} else {
    $content = "USE_TEST_DB=false`n" + $content
}

Set-Content -Path $envFile -Value $content -NoNewline

Write-Host "====================================================================" -ForegroundColor Magenta
Write-Host " [MODO PRODUCCION ACTIVADO]" -ForegroundColor Magenta
Write-Host " La API utilizara Turso Cloud / PostgreSQL segun .env" -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Magenta

