#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Clonación de Datos: Turso Cloud (Producción) -> SQLite Local (Testing)
SITRAC - Sistema Integral de Trabajos y Abastecimiento para Consorcios

Este script lee de forma SEGURA (SOLO LECTURA) la base de datos de producción en Turso
y replica exactamente su esquema y todos sus datos en 'sitrac_test.db' (SQLite local).
Permite hacer todas las pruebas destructivas, altas, bajas y modificaciones
sin riesgo de afectar los datos reales de producción.
"""

import os
import sys
import sqlite3
from pathlib import Path

# Directorio raíz del proyecto
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from scripts.migrar_datos_turso import get_turso_credentials, execute_pipeline, load_env

ENV_FILE = BASE_DIR / ".env"
TEST_DB_PATH = BASE_DIR / "sitrac_test.db"

def clone_production_to_test():
    print("=" * 70)
    print("SITRAC - Clonación de Base de Datos para Testing Local")
    print("=" * 70)

    if not ENV_FILE.exists():
        print(f"❌ No se encontró el archivo {ENV_FILE}")
        sys.exit(1)

    load_env(ENV_FILE)
    pipeline_url, token = get_turso_credentials()

    print(f"📡 Conectando en modo LECTURA a Turso: {pipeline_url}")

    # 1. Obtener DDL de tablas e índices
    res = execute_pipeline(pipeline_url, token, [
        {"sql": "SELECT name, type, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type DESC, name ASC;"}
    ])

    items = res.get('results', [])[0]['response']['result']['rows']
    tables_ddl = []
    indices_ddl = []
    views_ddl = []
    table_names = []

    for item in items:
        name = item[0]['value']
        item_type = item[1]['value']
        sql = item[2]['value']

        if item_type == 'table':
            tables_ddl.append((name, sql))
            table_names.append(name)
        elif item_type == 'index':
            indices_ddl.append((name, sql))
        elif item_type == 'view':
            views_ddl.append((name, sql))

    print(f"📋 Tablas detectadas en producción ({len(table_names)}): {', '.join(table_names)}")

    # 2. Recrear base de datos local SQLite de testing
    if TEST_DB_PATH.exists():
        try:
            TEST_DB_PATH.unlink()
            print(f"🗑️  Base de testing anterior eliminada: {TEST_DB_PATH.name}")
        except Exception as e:
            print(f"⚠️  No se pudo eliminar {TEST_DB_PATH.name}: {e}")

    conn = sqlite3.connect(TEST_DB_PATH)
    cursor = conn.cursor()

    # Desactivar llaves foráneas temporalmente para cargar datos en orden libre
    cursor.execute("PRAGMA foreign_keys = OFF;")

    print("\n[1/3] Creando estructura de tablas en base local...")
    for name, sql in tables_ddl:
        try:
            cursor.execute(sql)
        except Exception as e:
            print(f"  ⚠️ Error creando tabla {name}: {e}")

    print("\n[2/3] Descargando y clonando registros desde producción...")
    total_records = 0
    for tbl in table_names:
        # Consultar registros en Turso
        q_res = execute_pipeline(pipeline_url, token, [
            {"sql": f"SELECT * FROM \"{tbl}\";"}
        ])

        query_result = q_res.get('results', [])[0]['response']['result']
        cols = [c['name'] for c in query_result['cols']]
        rows = query_result.get('rows', [])

        if not cols:
            continue

        placeholders = ", ".join(["?" for _ in cols])
        cols_formatted = ", ".join([f'"{c}"' for c in cols])
        insert_sql = f'INSERT INTO "{tbl}" ({cols_formatted}) VALUES ({placeholders})'

        records_to_insert = []
        for r in rows:
            record = []
            for col_val in r:
                val = col_val.get('value')
                # En Turso null viene con type 'null'
                if col_val.get('type') == 'null':
                    val = None
                record.append(val)
            records_to_insert.append(record)

        if records_to_insert:
            cursor.executemany(insert_sql, records_to_insert)
            total_records += len(records_to_insert)
            print(f"  ✓ {tbl}: {len(records_to_insert)} filas copiadas.")
        else:
            print(f"  - {tbl}: vacía (0 filas).")

    print("\n[3/3] Creando índices y vistas...")
    for name, sql in indices_ddl:
        try:
            cursor.execute(sql)
        except Exception:
            pass

    for name, sql in views_ddl:
        try:
            cursor.execute(sql)
        except Exception:
            pass

    # Asegurar vista responsables si no existía en las vistas extraídas
    try:
        cursor.execute("DROP VIEW IF EXISTS responsables;")
        cursor.execute("""
            CREATE VIEW IF NOT EXISTS responsables AS 
            SELECT id, nombre_completo AS nombre, activo, usuario, email 
            FROM empleados;
        """)
    except Exception:
        pass

    cursor.execute("PRAGMA foreign_keys = ON;")
    conn.commit()
    conn.close()

    print("=" * 70)
    print(f"🎉 ¡Base de testing lista con éxito en: {TEST_DB_PATH.name}!")
    print(f"📊 Total de registros clonados: {total_records}")
    print(f"🛡️  Tu base de datos Turso de producción NO fue modificada.")
    print("=" * 70)

if __name__ == "__main__":
    clone_production_to_test()

