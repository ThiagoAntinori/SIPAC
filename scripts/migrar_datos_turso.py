#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Migración: CSVs de Datos -> Turso Cloud Database (libSQL)
SIPAC - Sistema Integral de Pañol y Abastecimiento para Consorcios / BASI Fix
"""

import os
import sys
import csv
import json
import re
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

# Configurar salida UTF-8 en consola
sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT_DIR / ".env"
DATOS_DIR = ROOT_DIR / "Datos"

def load_env(env_path: Path):
    """Carga variables desde archivo .env si existe."""
    if not env_path.exists():
        print(f"[Aviso] No se encontró archivo .env en: {env_path}")
        return
    print(f"[Config] Cargando variables desde: {env_path}")
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip("'\"")
                if key not in os.environ:
                    os.environ[key] = val

def get_turso_credentials():
    """Obtiene la URL HTTP y el token de Turso."""
    turso_url = os.environ.get("TURSO_DATABASE_URL", "").strip()
    turso_token = os.environ.get("TURSO_AUTH_TOKEN", "").strip()

    if not turso_url:
        raise ValueError("La variable de entorno TURSO_DATABASE_URL no está definida.")
    if not turso_token:
        raise ValueError("La variable de entorno TURSO_AUTH_TOKEN no está definida.")

    # Normalizar URL a https://.../v2/pipeline
    if turso_url.startswith("libsql://"):
        turso_url = "https://" + turso_url[len("libsql://"):]
    elif not turso_url.startswith("http://") and not turso_url.startswith("https://"):
        turso_url = "https://" + turso_url

    turso_url = turso_url.rstrip("/")
    if not turso_url.endswith("/v2/pipeline"):
        turso_url = f"{turso_url}/v2/pipeline"

    return turso_url, turso_token

def execute_pipeline(pipeline_url: str, token: str, statements: list):
    """
    Ejecuta un lote de statements SQL en Turso usando la API /v2/pipeline.
    statements: lista de dicts {'sql': '...', 'args': [...]}
    """
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
            "stmt": {
                "sql": sql,
                "args": formatted_args
            }
        })

    requests_payload.append({"type": "close"})

    payload_bytes = json.dumps({"requests": requests_payload}).encode("utf-8")
    req = urllib.request.Request(
        pipeline_url,
        data=payload_bytes,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    )

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            # Verificar si hubo errores en alguna de las respuestas
            for idx, r in enumerate(data.get("results", [])):
                if r.get("type") == "error":
                    error_msg = r.get("error", {}).get("message", "Error desconocido")
                    raise RuntimeError(f"Error en sentencia #{idx}: {error_msg}")
            return data
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        raise RuntimeError(f"Error HTTP {e.code} desde Turso: {error_body}")

def execute_single_sql(pipeline_url: str, token: str, sql: str, args: list = None):
    """Ejecuta una sentencia SQL simple y retorna las filas resultantes."""
    data = execute_pipeline(pipeline_url, token, [{"sql": sql, "args": args or []}])
    try:
        rows = data["results"][0]["response"]["result"]["rows"]
        # Convertir a valores planos
        clean_rows = []
        for r in rows:
            clean_rows.append([col.get("value") for col in r])
        return clean_rows
    except (KeyError, IndexError):
        return []

def parse_datetime(dt_str: str) -> str:
    """Parsea fecha argentina (d/M/yyyy H:mm:ss) a formato ISO SQLite (yyyy-MM-dd HH:mm:ss)."""
    if not dt_str or not dt_str.strip():
        return None
    s = dt_str.strip()
    formats = [
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d"
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(s, fmt)
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        except ValueError:
            continue
    raise ValueError(f"No se pudo parsear la fecha: '{s}'")

def make_guid(entity_code: int, original_id: int) -> str:
    """
    Genera un GUID determinístico a partir del ID entero:
    - Primeros 8 caracteres: ID entero (hex o dec padding)
    - Bloque de entidad: 0001 (UF), 0002 (Resp), 0003 (Cat), 0004 (OT), 0005 (Bit)
    - Últimos 12 caracteres: ID entero
    Ejemplo: ID 637 de UF -> 00000637-0001-0000-0000-000000000637
    """
    return f"{original_id:08d}-{entity_code:04d}-0000-0000-{original_id:012d}".lower()

def parse_bool(val: str) -> int:
    """Convierte valor booleano a 1 o 0."""
    if not val:
        return 0
    s = val.strip().lower()
    return 1 if s in ("true", "1", "t", "si", "verdadero") else 0

def check_turso_connection(pipeline_url: str, token: str):
    """Verifica que la conexión a Turso sea exitosa."""
    print(f"[Conexión] Verificando conectividad con Turso...")
    print(f"            Endpoint: {pipeline_url}")
    result = execute_single_sql(pipeline_url, token, "SELECT sqlite_version();")
    if result and len(result) > 0:
        print(f"            ✓ Conexión exitosa. Versión de SQLite: {result[0][0]}")
    else:
        raise RuntimeError("No se pudo obtener respuesta de Turso.")

def get_current_table_counts(pipeline_url: str, token: str):
    """Consulta la cantidad de filas actuales en las tablas objetivo."""
    tables = [
        "unidades_funcionales",
        "empleados",
        "categorias_trabajo",
        "ordenes_trabajo",
        "bitacora_logs"
    ]
    counts = {}
    for tbl in tables:
        try:
            res = execute_single_sql(pipeline_url, token, f"SELECT COUNT(*) FROM {tbl};")
            counts[tbl] = int(res[0][0]) if res else 0
        except Exception:
            counts[tbl] = 0
    return counts

def send_in_batches(pipeline_url: str, token: str, statements: list, batch_size: int = 75, desc: str = ""):
    """Envía sentencias en lotes para respetar los límites de carga de la API."""
    total = len(statements)
    if total == 0:
        return
    print(f"[{desc}] Insertando {total} registros en lotes de {batch_size}...")
    for i in range(0, total, batch_size):
        batch = statements[i:i + batch_size]
        # Envolver en transacción cada lote
        batch_with_tx = [{"sql": "BEGIN TRANSACTION;"}] + batch + [{"sql": "COMMIT;"}]
        execute_pipeline(pipeline_url, token, batch_with_tx)
        done = min(i + batch_size, total)
        sys.stdout.write(f"\r  Progreso: {done}/{total} ({done*100//total}%)")
        sys.stdout.flush()
    print(f"\n  ✓ {desc} completado ({total} registros).")

def migrate():
    print("=" * 70)
    print("SIPAC / BASI Fix - Proceso de Migración a Turso Database")
    print("=" * 70)

    # 1. Cargar entorno y credenciales
    load_env(ENV_FILE)
    pipeline_url, token = get_turso_credentials()

    # 2. Verificar conexión
    check_turso_connection(pipeline_url, token)

    # 3. Estado previo
    print("\n[Estado Previo en Turso]:")
    initial_counts = get_current_table_counts(pipeline_url, token)
    for tbl, cnt in initial_counts.items():
        print(f"  - {tbl:22s}: {cnt:5d} filas")

    # 4. Verificar existencia de archivos CSV
    csv_files = {
        "categorias": DATOS_DIR / "BASI Fix - DB - categorias_trabajo.csv",
        "responsables": DATOS_DIR / "BASI Fix - DB - responsables.csv",
        "unidades": DATOS_DIR / "BASI Fix - DB - unidades_funcionales.csv",
        "ordenes": DATOS_DIR / "BASI Fix - DB - ordenes_trabajo.csv",
        "bitacora": DATOS_DIR / "BASI Fix - DB - registro_bitacora.csv",
    }

    for name, p in csv_files.items():
        if not p.exists():
            raise FileNotFoundError(f"Archivo requerido no encontrado: {p}")

    print(f"\n[Lectura de CSVs desde: {DATOS_DIR}]:")

    # ── 4.1. Categorías de Trabajo ─────────────────────────────────────────────
    categorias_stmts = []
    with open(csv_files["categorias"], "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cid = int(row["id"].strip())
            guid = make_guid(3, cid)
            nombre = row["nombre"].strip()
            activo = parse_bool(row.get("activo", "TRUE"))
            categorias_stmts.append({
                "sql": "INSERT INTO categorias_trabajo (id, nombre, activo) VALUES (?, ?, ?);",
                "args": [guid, nombre, activo]
            })
    print(f"  - categorias_trabajo     : {len(categorias_stmts):5d} registros leídos.")

    # ── 4.2. Responsables ──────────────────────────────────────────────────────
    responsables_stmts = []
    with open(csv_files["responsables"], "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rid = int(row["id"].strip())
            guid = make_guid(2, rid)
            nombre = row["nombre"].strip()
            activo = parse_bool(row.get("activo", "TRUE"))
            responsables_stmts.append({
                "sql": "INSERT INTO responsables (id, nombre, activo) VALUES (?, ?, ?);",
                "args": [guid, nombre, activo]
            })
    print(f"  - responsables           : {len(responsables_stmts):5d} registros leídos.")

    # ── 4.3. Unidades Funcionales ──────────────────────────────────────────────
    unidades_stmts = []
    uf_ids_set = set()
    with open(csv_files["unidades"], "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            uid = int(row["id"].strip())
            uf_ids_set.add(uid)
            guid = make_guid(1, uid)
            sector = row["sector_escalera"].strip()
            piso = row.get("piso", "").strip() or None
            depto = row.get("depto", "").strip() or None
            unidades_stmts.append({
                "sql": "INSERT INTO unidades_funcionales (id, sector_escalera, piso, depto) VALUES (?, ?, ?, ?);",
                "args": [guid, sector, piso, depto]
            })
    print(f"  - unidades_funcionales   : {len(unidades_stmts):5d} registros leídos.")

    # ── 4.4. Órdenes de Trabajo ────────────────────────────────────────────────
    ordenes_stmts = []
    ot_ids_set = set()
    with open(csv_files["ordenes"], "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            oid = int(row["id_ot"].strip())
            ot_ids_set.add(oid)
            guid = make_guid(4, oid)

            uf_id_int = int(row["unidad_funcional_id"].strip())
            uf_guid = make_guid(1, uf_id_int)

            resp_id_int = int(row["responsable_id"].strip())
            resp_guid = make_guid(2, resp_id_int)

            cat_id_int = int(row["categoria_id"].strip())
            cat_guid = make_guid(3, cat_id_int)

            problema = row["problema_reportado"].strip()
            solucion = row.get("solucion_realizada", "").strip() or None
            estado = row.get("estado", "Pendiente").strip()
            observaciones = row.get("observaciones", "").strip() or None

            created_at = parse_datetime(row.get("created_at"))
            updated_at = parse_datetime(row.get("updated_at")) or created_at
            deleted_at = parse_datetime(row.get("deleted_at")) if row.get("deleted_at") else None

            ordenes_stmts.append({
                "sql": """INSERT INTO ordenes_trabajo 
                          (id, unidad_funcional_id, responsable_id, categoria_id, problema_reportado, solucion_realizada, estado, observaciones, created_at, updated_at, deleted_at) 
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);""",
                "args": [guid, uf_guid, resp_guid, cat_guid, problema, solucion, estado, observaciones, created_at, updated_at, deleted_at]
            })

    # Caso especial OT #2: fue eliminada físicamente (<24hs) en el sistema original, pero tiene 2 registros en bitácora.
    # Para preservar la integridad referencial de FK en bitacora_logs sin violar restricciones, insertamos OT #2 con deleted_at.
    # EF Core la excluye automáticamente de todas las consultas gracias a su query filter HasQueryFilter(o => o.DeletedAt == null).
    if 2 not in ot_ids_set:
        guid_ot2 = make_guid(4, 2)
        uf_fallback = make_guid(1, next(iter(uf_ids_set)))
        resp_fallback = make_guid(2, 1)
        cat_fallback = make_guid(3, 1)
        deleted_ot2_time = "2026-07-10 12:03:57"
        ordenes_stmts.append({
            "sql": """INSERT INTO ordenes_trabajo 
                      (id, unidad_funcional_id, responsable_id, categoria_id, problema_reportado, solucion_realizada, estado, observaciones, created_at, updated_at, deleted_at) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);""",
            "args": [
                guid_ot2, uf_fallback, resp_fallback, cat_fallback,
                "[Registro de OT eliminada físicamente por regla < 24hs]",
                None, "Cancelado", "Baja física registrada en bitácora histórica.",
                "2026-07-10 11:55:19", deleted_ot2_time, deleted_ot2_time
            ]
        })
        print("  - Nota informativa       : Se incluyó OT #2 archivada para preservar sus registros históricos en bitácora.")

    print(f"  - ordenes_trabajo        : {len(ordenes_stmts):5d} registros a insertar.")

    # ── 4.5. Bitácora de Logs ──────────────────────────────────────────────────
    bitacora_stmts = []
    with open(csv_files["bitacora"], "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            bid = int(row["id"].strip())
            guid = make_guid(5, bid)

            ot_id_int = int(row["orden_trabajo_id"].strip())
            ot_guid = make_guid(4, ot_id_int)

            tipo_op = row["tipo_operacion"].strip()
            detalle = row["detalle_cambio"].strip()
            fecha_hora = parse_datetime(row["fecha_hora"])

            bitacora_stmts.append({
                "sql": """INSERT INTO bitacora_logs 
                          (id, orden_trabajo_id, tipo_operacion, detalle_cambio, created_at) 
                          VALUES (?, ?, ?, ?, ?);""",
                "args": [guid, ot_guid, tipo_op, detalle, fecha_hora]
            })
    print(f"  - bitacora_logs          : {len(bitacora_stmts):5d} registros leídos.")

    # ── 5. Limpieza de datos de prueba anteriores ──────────────────────────────
    print("\n[Limpieza de Datos de Demostración Anteriores]:")
    cleanup_statements = [
        {"sql": "DROP TABLE IF EXISTS registro_bitacora_ot;"},
        {"sql": "DELETE FROM bitacora_logs;"},
        {"sql": "DELETE FROM egresos_consumo WHERE orden_trabajo_id IN (SELECT id FROM ordenes_trabajo);"},
        {"sql": "DELETE FROM ordenes_trabajo;"},
        {"sql": "DELETE FROM unidades_funcionales;"},
        {"sql": "DELETE FROM responsables;"},
        {"sql": "DELETE FROM categorias_trabajo;"}
    ]
    execute_pipeline(pipeline_url, token, cleanup_statements)
    print("  ✓ Tablas operativas limpiadas correctamente para la migración.")

    # ── 6. Inserción de Datos Operativos en Turso ──────────────────────────────
    print("\n[Ejecución de Migración en Turso Cloud]:")
    send_in_batches(pipeline_url, token, categorias_stmts, batch_size=50, desc="Categorías de Trabajo")
    send_in_batches(pipeline_url, token, responsables_stmts, batch_size=50, desc="Responsables")
    send_in_batches(pipeline_url, token, unidades_stmts, batch_size=100, desc="Unidades Funcionales")
    send_in_batches(pipeline_url, token, ordenes_stmts, batch_size=50, desc="Órdenes de Trabajo")
    send_in_batches(pipeline_url, token, bitacora_stmts, batch_size=50, desc="Bitácora de Logs")

    # ── 7. Verificación Final en Turso ─────────────────────────────────────────
    print("\n" + "=" * 70)
    print("VERIFICACIÓN FINAL DE DATOS EN TURSO")
    print("=" * 70)
    final_counts = get_current_table_counts(pipeline_url, token)
    
    expected = {
        "categorias_trabajo": len(categorias_stmts),
        "responsables": len(responsables_stmts),
        "unidades_funcionales": len(unidades_stmts),
        "ordenes_trabajo": len(ordenes_stmts),
        "bitacora_logs": len(bitacora_stmts),
    }

    all_matched = True
    for tbl, expected_cnt in expected.items():
        actual_cnt = final_counts.get(tbl, 0)
        match_str = "✓ CORRECTO" if actual_cnt == expected_cnt else "✗ DISCREPANCIA"
        if actual_cnt != expected_cnt:
            all_matched = False
        print(f"  {tbl:24s} -> Esperado: {expected_cnt:5d} | En Turso: {actual_cnt:5d}  [{match_str}]")

    if all_matched:
        print("\n🎉 ¡MIGRACIÓN COMPLETADA EXITOSAMENTE! Todos los datos operativos han sido transferidos a Turso.")
    else:
        print("\n⚠️ Advertencia: Algunos conteos no coinciden exactamente. Revisa los mensajes anteriores.")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as ex:
        print(f"\n[ERROR FATAL]: {ex}", file=sys.stderr)
        sys.exit(1)
