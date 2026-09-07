using Microsoft.EntityFrameworkCore;

namespace SIPAC.API.Data;

public static class DbMigrationHelper
{
    public static async Task ApplyCustomMigrationsAsync(SipacDbContext context)
    {
        var isPostgres = context.Database.IsNpgsql();

        if (isPostgres)
        {
            await ApplyPostgresMigrationsAsync(context);
        }
        else
        {
            await ApplySqliteOrTursoMigrationsAsync(context);
        }
    }

    private static async Task ApplySqliteOrTursoMigrationsAsync(SipacDbContext context)
    {
        var alterStatements = new[]
        {
            "ALTER TABLE empleados ADD COLUMN usuario TEXT;",
            "ALTER TABLE empleados ADD COLUMN email TEXT;",
            "ALTER TABLE empleados ADD COLUMN pin_hash TEXT;",
            "ALTER TABLE empleados ADD COLUMN token_alta_pin TEXT;",
            "ALTER TABLE empleados ADD COLUMN token_alta_expira TEXT;",
            "ALTER TABLE ordenes_trabajo ADD COLUMN leida_por_operario INTEGER DEFAULT 0;",
            "ALTER TABLE ordenes_trabajo ADD COLUMN motivo_suspension TEXT;"
        };

        foreach (var sql in alterStatements)
        {
            try
            {
                await context.Database.ExecuteSqlRawAsync(sql);
            }
            catch (Exception)
            {
                // Columna ya existe en SQLite/Turso, se ignora
            }
        }

        try
        {
            await context.Database.ExecuteSqlRawAsync(@"
                CREATE TABLE IF NOT EXISTS suscripciones_push (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    responsable_id TEXT NOT NULL,
                    endpoint TEXT NOT NULL,
                    p256dh TEXT NOT NULL,
                    auth TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (responsable_id) REFERENCES empleados (id) ON DELETE CASCADE
                );
            ");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DbMigrationHelper] Error al crear tabla suscripciones_push: {ex.Message}");
        }

        try
        {
            await context.Database.ExecuteSqlRawAsync("DROP VIEW IF EXISTS responsables;");
            await context.Database.ExecuteSqlRawAsync(@"
                CREATE VIEW IF NOT EXISTS responsables AS 
                SELECT id, nombre_completo AS nombre, activo, usuario, email 
                FROM empleados;
            ");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DbMigrationHelper] Aviso al recrear vista responsables: {ex.Message}");
        }
    }

    private static async Task ApplyPostgresMigrationsAsync(SipacDbContext context)
    {
        var pgStatements = new[]
        {
            "ALTER TABLE empleados ADD COLUMN IF NOT EXISTS usuario VARCHAR(50);",
            "ALTER TABLE empleados ADD COLUMN IF NOT EXISTS email VARCHAR(150);",
            "ALTER TABLE empleados ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255);",
            "ALTER TABLE empleados ADD COLUMN IF NOT EXISTS token_alta_pin VARCHAR(255);",
            "ALTER TABLE empleados ADD COLUMN IF NOT EXISTS token_alta_expira TIMESTAMPTZ;",
            "ALTER TABLE ordenes_trabajo ADD COLUMN IF NOT EXISTS leida_por_operario BOOLEAN DEFAULT false;",
            "ALTER TABLE ordenes_trabajo ADD COLUMN IF NOT EXISTS motivo_suspension TEXT;",
            @"CREATE TABLE IF NOT EXISTS suscripciones_push (
                id BIGSERIAL PRIMARY KEY,
                responsable_id UUID NOT NULL,
                endpoint TEXT NOT NULL,
                p256dh TEXT NOT NULL,
                auth TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now(),
                CONSTRAINT fk_suscripciones_push_responsable FOREIGN KEY (responsable_id) REFERENCES empleados (id) ON DELETE CASCADE
            );"
        };

        foreach (var sql in pgStatements)
        {
            try
            {
                await context.Database.ExecuteSqlRawAsync(sql);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DbMigrationHelper] Aviso en migración Postgres: {ex.Message}");
            }
        }
    }
}
