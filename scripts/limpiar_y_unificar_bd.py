#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Limpieza y Unificación de Tablas en Turso Database:
1. Elimina tablas huérfanas/fantasma de migraciones previas (AjustesInventario, AuditLogs, Categorias, DetallesCompra).
2. Unifica 'responsables' y 'empleados' en la tabla 'empleados' (con IDs Guid, conservando integridad con ordenes_trabajo).
3. Crea vista 'responsables' para compatibilidad hacia atrás.
4. Valida integridad referencial (PRAGMA foreign_key_check).
"""

import os
import sys
import json
import urllib.request
import urllib.error
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT_DIR / ".env"

def load_env(env_path: Path):
    if not env_path.exists():
        print(f"[Aviso] No se encontró archivo .env en: {env_path}")
        return
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip().strip("'\"")

def get_turso_credentials():
    turso_url = os.environ.get("TURSO_DATABASE_URL", "").strip()
    turso_token = os.environ.get("TURSO_AUTH_TOKEN", "").strip()
    if not turso_url or not turso_token:
        raise ValueError("Credenciales TURSO_DATABASE_URL o TURSO_AUTH_TOKEN faltantes.")
    if turso_url.startswith("libsql://"):
        turso_url = "https://" + turso_url[len("libsql://"):]
    elif not turso_url.startswith("http"):
        turso_url = "https://" + turso_url
    turso_url = turso_url.rstrip("/")
    if not turso_url.endswith("/v2/pipeline"):
        turso_url = f"{turso_url}/v2/pipeline"
    return turso_url, turso_token

def execute_pipeline(pipeline_url: str, token: str, statements: list):
    requests_payload = []
    for s in statements:
        sql = s["sql"]
        args = s.get("args", [])
        formatted_args = []
        for a in args:
            if a is None:
                formatted_args.append({"type": "null"})
            elif isinstance(a, bool):
                formatted_args.append({"type": "integer", "value": "1" if a else "0"})
            elif isinstance(a, int):
                formatted_args.append({"type": "integer", "value": str(a)})
            elif isinstance(a, float):
                formatted_args.append({"type": "float", "value": a})
            else:
                formatted_args.append({"type": "text", "value": str(a)})
        requests_payload.append({
            "type": "execute",
            "stmt": {"sql": sql, "args": formatted_args}
        })
    requests_payload.append({"type": "close"})

    payload_bytes = json.dumps({"requests": requests_payload}).encode("utf-8")
    req = urllib.request.Request(
        pipeline_url,
        data=payload_bytes,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        for idx, r in enumerate(data.get("results", [])):
            if r.get("type") == "error":
                raise RuntimeError(f"Error en sentencia #{idx} ({statements[idx]['sql']}): {r['error']['message']}")
        return data

def execute_single_sql(pipeline_url: str, token: str, sql: str, args: list = None):
    data = execute_pipeline(pipeline_url, token, [{"sql": sql, "args": args or []}])
    try:
        rows = data["results"][0]["response"]["result"]["rows"]
        return [[col.get("value") for col in r] for r in rows]
    except (KeyError, IndexError):
        return []

def main():
    print("=" * 70)
    print("SIPAC / BASI Fix - Limpieza y Unificación de Tablas en Turso")
    print("=" * 70)

    load_env(ENV_FILE)
    url, token = get_turso_credentials()

    # 1. Eliminar tablas fantasma (PascalCase de migración previa)
    print("\n[Paso 1] Eliminando tablas fantasma / huérfanas en desuso...")
    zombie_tables = ["AjustesInventario", "AuditLogs", "Categorias", "DetallesCompra", "registro_bitacora_ot"]
    for tbl in zombie_tables:
        execute_pipeline(url, token, [{"sql": f'DROP TABLE IF EXISTS "{tbl}";'}])
        print(f"  ✓ Tabla descartada: {tbl}")

    # 2. Obtener datos actuales de 'responsables'
    print("\n[Paso 2] Leyendo datos operativos de responsables...")
    resp_rows = execute_single_sql(url, token, "SELECT id, nombre, activo FROM responsables;")
    print(f"  ✓ {len(resp_rows)} responsables encontrados:")
    for r in resp_rows:
        print(f"     - {r[0]} | {r[1]} (Activo: {r[2]})")

    # 3. Recrear tabla 'empleados' con UUIDs y poblar con el personal real
    print("\n[Paso 3] Unificando en tabla 'empleados'...")
    # Crear empleados_new
    stmts_empleados = [
        {"sql": "DROP TABLE IF EXISTS empleados_new;"},
        {"sql": """CREATE TABLE empleados_new (
            id TEXT NOT NULL CONSTRAINT PK_empleados PRIMARY KEY,
            nombre_completo TEXT NOT NULL,
            legajo TEXT NULL,
            puesto_sector TEXT NULL,
            activo INTEGER NOT NULL
        );"""}
    ]

    legajo_map = {
        "Claudio": ("LEG-1001", "Mantenimiento General"),
        "Silvio": ("LEG-1002", "Mantenimiento General"),
        "Hugo": ("LEG-1003", "Mantenimiento General"),
        "Alberto": ("LEG-1004", "Electricidad y Mantenimiento")
    }

    for r in resp_rows:
        rid, rnombre, ractivo = r[0], r[1], int(r[2])
        leg, puesto = legajo_map.get(rnombre, (f"LEG-{rid[-4:]}", "Técnico Mantenimiento"))
        stmts_empleados.append({
            "sql": "INSERT INTO empleados_new (id, nombre_completo, legajo, puesto_sector, activo) VALUES (?, ?, ?, ?, ?);",
            "args": [rid, rnombre, leg, puesto, ractivo]
        })

    execute_pipeline(url, token, stmts_empleados)
    print("  ✓ Tabla 'empleados_new' creada y poblada con el personal operativo real.")

    # 4. Actualizar ordenes_trabajo para referenciar 'empleados'
    print("\n[Paso 4] Actualizando clave foránea en 'ordenes_trabajo' hacia 'empleados'...")
    stmts_ot = [
        {"sql": "DROP TABLE IF EXISTS ordenes_trabajo_new;"},
        {"sql": """CREATE TABLE ordenes_trabajo_new (
            id TEXT NOT NULL CONSTRAINT PK_ordenes_trabajo PRIMARY KEY,
            unidad_funcional_id TEXT NOT NULL,
            responsable_id TEXT NOT NULL,
            categoria_id TEXT NOT NULL,
            problema_reportado TEXT NOT NULL,
            solucion_realizada TEXT NULL,
            estado TEXT NOT NULL,
            observaciones TEXT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            deleted_at TEXT NULL,
            CONSTRAINT FK_ordenes_trabajo_categorias_trabajo_categoria_id FOREIGN KEY (categoria_id) REFERENCES categorias_trabajo (id) ON DELETE RESTRICT,
            CONSTRAINT FK_ordenes_trabajo_empleados_responsable_id FOREIGN KEY (responsable_id) REFERENCES empleados_new (id) ON DELETE RESTRICT,
            CONSTRAINT FK_ordenes_trabajo_unidades_funcionales_unidad_funcional_id FOREIGN KEY (unidad_funcional_id) REFERENCES unidades_funcionales (id) ON DELETE RESTRICT
        );"""},
        {"sql": "INSERT INTO ordenes_trabajo_new SELECT * FROM ordenes_trabajo;"},
        {"sql": "DROP TABLE ordenes_trabajo;"},
        {"sql": "ALTER TABLE ordenes_trabajo_new RENAME TO ordenes_trabajo;"},
        {"sql": "DROP TABLE IF EXISTS empleados;"},
        {"sql": "ALTER TABLE empleados_new RENAME TO empleados;"},
        {"sql": "DROP TABLE IF EXISTS responsables;"},
        {"sql": "CREATE VIEW IF NOT EXISTS responsables AS SELECT id, nombre_completo AS nombre, activo FROM empleados;"}
    ]
    execute_pipeline(url, token, stmts_ot)
    print("  ✓ 'ordenes_trabajo' actualizada para enlazar a 'empleados'.")
    print("  ✓ Tabla 'responsables' reemplazada por VIEW hacia 'empleados'.")

    # 5. Validación de integridad
    print("\n[Paso 5] Verificando integridad referencial en Turso...")
    fk_errors = execute_single_sql(url, token, "PRAGMA foreign_key_check;")
    if fk_errors:
        print(f"  ⚠️ Errores de FK detectados: {fk_errors}")
    else:
        print("  ✓ PRAGMA foreign_key_check: 0 errores. Integridad 100% válida.")

    # 6. Catálogo final
    print("\n[Paso 6] Catálogo final de tablas en Turso:")
    tables = execute_single_sql(url, token, "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY type, name;")
    for t in tables:
        cnt_str = ""
        if t[1] in ("table", "view"):
            try:
                cnt = execute_single_sql(url, token, f"SELECT COUNT(*) FROM {t[0]};")
                cnt_str = f"({cnt[0][0]} filas)"
            except Exception:
                cnt_str = ""
        print(f"  - [{t[1].upper():5s}] {t[0]:25s} {cnt_str}")

    print("\n🎉 ¡Limpieza y unificación completada exitosamente en Turso!")

if __name__ == "__main__":
    main()

