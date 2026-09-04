using Microsoft.EntityFrameworkCore;
using SIPAC.API.Entities;
using SIPAC.API.Services;

namespace SIPAC.API.Data;

public static class SeedData
{
    public static async Task InitializeAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SipacDbContext>();
        var authService = scope.ServiceProvider.GetRequiredService<AuthService>();

        try
        {
            await context.Database.MigrateAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SeedData] Aviso al verificar migraciones de base de datos: {ex.Message}");
        }

        // ── 1. Seed Categorías de Pañol / Artículos ──────────────────────────────
        if (!await context.Categorias.AnyAsync())
        {
            var categorias = new List<Categoria>
            {
                new() { Nombre = "Herramientas Manuales" },
                new() { Nombre = "Herramientas Eléctricas" },
                new() { Nombre = "Electricidad e Iluminación" },
                new() { Nombre = "Plomería y Gas" },
                new() { Nombre = "Ferretería y Tornillería" },
                new() { Nombre = "Pinturas y Adhesivos" },
                new() { Nombre = "Seguridad e Higiene (EPP)" },
                new() { Nombre = "Limpieza y Mantenimiento" }
            };
            await context.Categorias.AddRangeAsync(categorias);
            await context.SaveChangesAsync();
        }

        // ── 2. Seed Usuarios ──────────────────────────────────────────────────────
        if (!await context.Usuarios.AnyAsync())
        {
            var adminUser = new Usuario
            {
                NombreCompleto = "Administrador del Sistema",
                Username = "admin",
                PasswordHash = authService.HashPassword("Admin123!"),
                Rol = "Admin",
                Activo = true
            };

            var panoleroUser = new Usuario
            {
                NombreCompleto = "Martín Pañolero",
                Username = "panolero",
                PasswordHash = authService.HashPassword("Panol123!"),
                Rol = "Pañolero",
                Activo = true
            };

            await context.Usuarios.AddRangeAsync(adminUser, panoleroUser);
            await context.SaveChangesAsync();
        }



        // ── 3. Seed Empleados / Personal ──────────────────────────────────────────
        if (!await context.Empleados.AnyAsync())
        {
            var empleados = new List<Empleado>
            {
                new() { Id = Guid.Parse("00000001-0002-0000-0000-000000000001"), NombreCompleto = "Claudio", Legajo = "LEG-001", PuestoSector = "Técnico Mantenimiento", Activo = true },
                new() { Id = Guid.Parse("00000002-0002-0000-0000-000000000002"), NombreCompleto = "Silvio", Legajo = "LEG-002", PuestoSector = "Técnico Mantenimiento", Activo = true },
                new() { Id = Guid.Parse("00000003-0002-0000-0000-000000000003"), NombreCompleto = "Hugo", Legajo = "LEG-003", PuestoSector = "Técnico Mantenimiento", Activo = true },
                new() { Id = Guid.Parse("00000004-0002-0000-0000-000000000004"), NombreCompleto = "Alberto", Legajo = "LEG-004", PuestoSector = "Técnico Mantenimiento", Activo = true }
            };
            await context.Empleados.AddRangeAsync(empleados);
            await context.SaveChangesAsync();
        }

        // ── 5. Seed Categorías de Trabajo / Rubros (BASI Fix) ─────────────────────
        if (!await context.CategoriasTrabajo.AnyAsync())
        {
            var rubros = new List<CategoriaTrabajo>
            {
                new() { Nombre = "Plomería", Activo = true },
                new() { Nombre = "Electricidad", Activo = true },
                new() { Nombre = "Iluminación Común", Activo = true },
                new() { Nombre = "Mantenimiento Edilicio", Activo = true },
                new() { Nombre = "Espacios Verdes", Activo = true },
                new() { Nombre = "Cerrajería", Activo = true },
                new() { Nombre = "Gas y Calefacción", Activo = true },
                new() { Nombre = "Limpieza y Desinfección", Activo = true }
            };
            await context.CategoriasTrabajo.AddRangeAsync(rubros);
            await context.SaveChangesAsync();
        }

        // ── 6. Seed Catálogo Maestro de Unidades Funcionales ─────────────────────
        if (!await context.UnidadesFuncionales.AnyAsync())
        {
            var ufs = new List<UnidadFuncional>();

            // Sectores Residenciales Estándar (28, 45, 116, 120)
            var sectores = new[] { "28", "45", "116", "120" };
            var pisos = new[] { "PB", "1", "2", "3", "4" };
            var deptos = new[] { "A", "B", "C", "D" };

            foreach (var sec in sectores)
            {
                foreach (var piso in pisos)
                {
                    foreach (var depto in deptos)
                    {
                        ufs.Add(new UnidadFuncional
                        {
                            Id = Guid.NewGuid(),
                            SectorEscalera = sec,
                            Piso = piso,
                            Depto = depto
                        });
                    }
                }
            }

            // Torres en Altura (Torre A y Torre B, Pisos PB a 10, Deptos 1 a 4)
            var torres = new[] { "Torre A", "Torre B" };
            var pisosTorre = new[] { "PB", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10" };
            var deptosTorre = new[] { "1", "2", "3", "4" };

            foreach (var torre in torres)
            {
                foreach (var piso in pisosTorre)
                {
                    foreach (var depto in deptosTorre)
                    {
                        ufs.Add(new UnidadFuncional
                        {
                            Id = Guid.NewGuid(),
                            SectorEscalera = torre,
                            Piso = piso,
                            Depto = depto
                        });
                    }
                }
            }

            // Locales Comerciales (Sector = 'LOCAL', Piso = '1'...'15', Depto = null)
            for (int i = 1; i <= 15; i++)
            {
                ufs.Add(new UnidadFuncional
                {
                    Id = Guid.NewGuid(),
                    SectorEscalera = "LOCAL",
                    Piso = i.ToString(),
                    Depto = null
                });
            }

            await context.UnidadesFuncionales.AddRangeAsync(ufs);
            await context.SaveChangesAsync();
        }

        // ── 7. Seed Artículos de Pañol ───────────────────────────────────────────
        if (!await context.Articulos.AnyAsync())
        {
            var catElectricidad = await context.Categorias.FirstOrDefaultAsync(c => c.Nombre.Contains("Electricidad"));
            var catFerreteria = await context.Categorias.FirstOrDefaultAsync(c => c.Nombre.Contains("Ferretería"));
            var catEPP = await context.Categorias.FirstOrDefaultAsync(c => c.Nombre.Contains("Seguridad"));
            var catHerramientas = await context.Categorias.FirstOrDefaultAsync(c => c.Nombre.Contains("Manuales"));
            var catPlomeria = await context.Categorias.FirstOrDefaultAsync(c => c.Nombre.Contains("Plomería"));

            var articulos = new List<Articulo>
            {
                new()
                {
                    Nombre = "Cinta Aisladora 3M 20m",
                    CategoriaId = catElectricidad?.Id ?? 1,
                    UnidadMedida = "Rollo",
                    EsFraccionable = false,
                    StockActual = 15,
                    StockMinimo = 5,
                    Activo = true
                },
                new()
                {
                    Nombre = "Lámpara LED 12W E27 Fría",
                    CategoriaId = catElectricidad?.Id ?? 1,
                    UnidadMedida = "Unidad",
                    EsFraccionable = false,
                    StockActual = 4, // Alerta stock bajo
                    StockMinimo = 10,
                    Activo = true
                },
                new()
                {
                    Nombre = "Tornillo Autoperforante 1 1/2 pulg",
                    CategoriaId = catFerreteria?.Id ?? 1,
                    UnidadMedida = "Unidad",
                    EsFraccionable = true,
                    StockActual = 120,
                    StockMinimo = 50,
                    Activo = true
                },
                new()
                {
                    Nombre = "Guantes de Nitrilo Talle L",
                    CategoriaId = catEPP?.Id ?? 1,
                    UnidadMedida = "Par",
                    EsFraccionable = false,
                    StockActual = 3, // Alerta stock bajo
                    StockMinimo = 8,
                    Activo = true
                },
                new()
                {
                    Nombre = "Llave Francesa 10 pulg",
                    CategoriaId = catHerramientas?.Id ?? 1,
                    UnidadMedida = "Unidad",
                    EsFraccionable = false,
                    StockActual = 4,
                    StockMinimo = 2,
                    Activo = true
                },
                new()
                {
                    Nombre = "Caño Termofusión 20mm x 4m",
                    CategoriaId = catPlomeria?.Id ?? 1,
                    UnidadMedida = "Tira",
                    EsFraccionable = true,
                    StockActual = 8,
                    StockMinimo = 4,
                    Activo = true
                },
                new()
                {
                    Nombre = "Toma Doble Jeluz Verona",
                    CategoriaId = catElectricidad?.Id ?? 1,
                    UnidadMedida = "Unidad",
                    EsFraccionable = false,
                    StockActual = 12,
                    StockMinimo = 4,
                    Activo = true
                },
                new()
                {
                    Nombre = "Teflón Alta Densidad 3/4 pulg",
                    CategoriaId = catPlomeria?.Id ?? 1,
                    UnidadMedida = "Rollo",
                    EsFraccionable = false,
                    StockActual = 20,
                    StockMinimo = 6,
                    Activo = true
                }
            };

            await context.Articulos.AddRangeAsync(articulos);
            await context.SaveChangesAsync();
        }

        // ── 8. Seed Órdenes de Trabajo (BASI Fix) y Auditoría ─────────────────────
        if (!await context.OrdenesTrabajo.AnyAsync())
        {
            var resp1 = await context.Empleados.FirstOrDefaultAsync(r => r.NombreCompleto.Contains("Claudio")) ?? await context.Empleados.FirstOrDefaultAsync();
            var resp2 = await context.Empleados.FirstOrDefaultAsync(r => r.NombreCompleto.Contains("Silvio")) ?? resp1;
            var resp3 = await context.Empleados.FirstOrDefaultAsync(r => r.NombreCompleto.Contains("Hugo")) ?? resp1;

            var catPlomeria = await context.CategoriasTrabajo.FirstOrDefaultAsync(c => c.Nombre.Contains("Plomería"));
            var catElectricidad = await context.CategoriasTrabajo.FirstOrDefaultAsync(c => c.Nombre.Contains("Electricidad"));
            var catIluminacion = await context.CategoriasTrabajo.FirstOrDefaultAsync(c => c.Nombre.Contains("Iluminación"));

            var ufDepto1 = await context.UnidadesFuncionales.FirstOrDefaultAsync(u => u.SectorEscalera == "28" && u.Piso == "2" && u.Depto == "B");
            var ufLocal3 = await context.UnidadesFuncionales.FirstOrDefaultAsync(u => u.SectorEscalera == "LOCAL" && u.Piso == "3");
            var ufTorre = await context.UnidadesFuncionales.FirstOrDefaultAsync(u => u.SectorEscalera == "Torre A" && u.Piso == "4" && u.Depto == "2");
            var ufAlerta = await context.UnidadesFuncionales.FirstOrDefaultAsync(u => u.SectorEscalera == "45" && u.Piso == "1" && u.Depto == "A");

            if (ufAlerta != null && resp1 != null && catPlomeria != null)
            {
                var adminUser = await context.Usuarios.FirstOrDefaultAsync(u => u.Username == "admin");

                // OT 1: ALERTA +5 DÍAS PENDIENTE (Creada hace 7 días)
                var ot1 = new OrdenTrabajo
                {
                    Id = Guid.NewGuid(),
                    UnidadFuncionalId = ufAlerta.Id,
                    ResponsableId = resp1.Id,
                    CategoriaId = catPlomeria.Id,
                    ProblemaReportado = "Pérdida de agua continua en canilla de paso de cocina. Filtración hacia piso inferior.",
                    Estado = "Pendiente",
                    Observaciones = "Reclamo reiterado por propietario. Prioridad urgente.",
                    CreatedAt = DateTime.UtcNow.AddDays(-7),
                    UpdatedAt = DateTime.UtcNow.AddDays(-7)
                };

                // OT 2: En Proceso (Local 3)
                var ot2 = new OrdenTrabajo
                {
                    Id = Guid.NewGuid(),
                    UnidadFuncionalId = ufLocal3?.Id ?? ufAlerta.Id,
                    ResponsableId = resp2?.Id ?? resp1.Id,
                    CategoriaId = catElectricidad?.Id ?? catPlomeria.Id,
                    ProblemaReportado = "Disyunción repentina de térmicas de iluminación de marquesina y vidriera.",
                    Estado = "En Proceso",
                    Observaciones = "Revisión de cableado exterior y aislamiento.",
                    CreatedAt = DateTime.UtcNow.AddDays(-2),
                    UpdatedAt = DateTime.UtcNow.AddDays(-1)
                };

                // OT 3: Pendiente Reciente (<24h)
                var ot3 = new OrdenTrabajo
                {
                    Id = Guid.NewGuid(),
                    UnidadFuncionalId = ufTorre?.Id ?? ufAlerta.Id,
                    ResponsableId = resp1.Id,
                    CategoriaId = catIluminacion?.Id ?? catPlomeria.Id,
                    ProblemaReportado = "Foco quemado y zócalo flojo en palier central.",
                    Estado = "Pendiente",
                    Observaciones = "Turno mañana.",
                    CreatedAt = DateTime.UtcNow.AddHours(-3),
                    UpdatedAt = DateTime.UtcNow.AddHours(-3)
                };

                // OT 4: Finalizada con Solución y Consumo de Materiales
                var ot4 = new OrdenTrabajo
                {
                    Id = Guid.NewGuid(),
                    UnidadFuncionalId = ufDepto1?.Id ?? ufAlerta.Id,
                    ResponsableId = resp3?.Id ?? resp1.Id,
                    CategoriaId = catPlomeria.Id,
                    ProblemaReportado = "Filtración en codo de termofusión bajo mesada.",
                    SolucionRealizada = "Se reemplazó tramo de 1 metro de caño termofusión de 20mm y se colocaron 2 cuplas y teflón de alta densidad. Prueba hidráulica realizada sin pérdidas.",
                    Estado = "Finalizado",
                    Observaciones = "Trabajo terminado con conformidad de morador.",
                    CreatedAt = DateTime.UtcNow.AddDays(-3),
                    UpdatedAt = DateTime.UtcNow.AddDays(-1)
                };

                await context.OrdenesTrabajo.AddRangeAsync(ot1, ot2, ot3, ot4);
                await context.SaveChangesAsync();

                // Bitácoras iniciales
                var bitacoras = new List<RegistroBitacoraOt>
                {
                    new()
                    {
                        Id = Guid.NewGuid(),
                        OrdenTrabajoId = ot1.Id,
                        TipoOperacion = "CREACION",
                        DetalleCambio = "Alta de OT registrada en sistema.",
                        FechaHora = ot1.CreatedAt
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        OrdenTrabajoId = ot2.Id,
                        TipoOperacion = "CREACION",
                        DetalleCambio = "Alta de OT registrada en sistema.",
                        FechaHora = ot2.CreatedAt
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        OrdenTrabajoId = ot2.Id,
                        TipoOperacion = "CAMBIO_ESTADO",
                        DetalleCambio = "Cambio de estado de 'Pendiente' a 'En Proceso'.",
                        FechaHora = ot2.UpdatedAt
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        OrdenTrabajoId = ot3.Id,
                        TipoOperacion = "CREACION",
                        DetalleCambio = "Alta de OT registrada en sistema.",
                        FechaHora = ot3.CreatedAt
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        OrdenTrabajoId = ot4.Id,
                        TipoOperacion = "CREACION",
                        DetalleCambio = "Alta de OT registrada en sistema.",
                        FechaHora = ot4.CreatedAt
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        OrdenTrabajoId = ot4.Id,
                        TipoOperacion = "CAMBIO_ESTADO",
                        DetalleCambio = "Cambio de estado a 'Finalizado'. Solución registrada.",
                        FechaHora = ot4.UpdatedAt
                    }
                };

                await context.BitacoraOt.AddRangeAsync(bitacoras);

                // Egresos consumidos vinculados a OT 4
                var canoTermo = await context.Articulos.FirstOrDefaultAsync(a => a.Nombre.Contains("Termofusión"));
                var teflon = await context.Articulos.FirstOrDefaultAsync(a => a.Nombre.Contains("Teflón"));

                if (canoTermo != null && teflon != null)
                {
                    var egresos = new List<EgresoConsumo>
                    {
                        new()
                        {
                            ArticuloId = canoTermo.Id,
                            OrdenTrabajoId = ot4.Id,
                            Cantidad = 0.25m, // 1 metro de tira de 4m
                            FechaHora = ot4.CreatedAt.AddHours(2),
                            UsuarioId = adminUser?.Id ?? 1,
                            Observacion = "Tramo para reparación bajo mesada"
                        },
                        new()
                        {
                            ArticuloId = teflon.Id,
                            OrdenTrabajoId = ot4.Id,
                            Cantidad = 1m,
                            FechaHora = ot4.CreatedAt.AddHours(2),
                            UsuarioId = adminUser?.Id ?? 1,
                            Observacion = "Sellado de uniones"
                        }
                    };

                    await context.EgresosConsumo.AddRangeAsync(egresos);
                }

                await context.SaveChangesAsync();
            }
        }
    }
}
