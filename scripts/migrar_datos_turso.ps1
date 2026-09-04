<#
.SYNOPSIS
    Script PowerShell para ejecutar la migración de datos CSV hacia Turso Database.
.DESCRIPTION
    Llama al script Python 'migrar_datos_turso.py' con el intérprete del sistema.
#>

param()

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PythonScript = Join-Path $ScriptDir "migrar_datos_turso.py"

if (-not (Test-Path $PythonScript)) {
    Write-Error "No se encontró el script de migración: $PythonScript"
    exit 1
}

Write-Host "Iniciando migración de datos a Turso Cloud..." -ForegroundColor Cyan
python $PythonScript

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nProceso finalizado correctamente." -ForegroundColor Green
} else {
    Write-Host "`nOcurrió un error durante la migración." -ForegroundColor Red
    exit $LASTEXITCODE
}

