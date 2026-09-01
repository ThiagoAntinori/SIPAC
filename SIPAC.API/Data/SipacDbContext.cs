using Microsoft.EntityFrameworkCore;
using SIPAC.API.Entities;

namespace SIPAC.API.Data;

public class SipacDbContext : DbContext
{
    public SipacDbContext(DbContextOptions<SipacDbContext> options) : base(options) { }

    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Categoria> Categorias => Set<Categoria>();
    public DbSet<Articulo> Articulos => Set<Articulo>();
    public DbSet<Empleado> Empleados => Set<Empleado>();
    public DbSet<UnidadFuncional> UnidadesFuncionales => Set<UnidadFuncional>();
    public DbSet<Responsable> Responsables => Set<Responsable>();
    public DbSet<CategoriaTrabajo> CategoriasTrabajo => Set<CategoriaTrabajo>();
    public DbSet<OrdenTrabajo> OrdenesTrabajo => Set<OrdenTrabajo>();
    public DbSet<RegistroBitacoraOt> BitacoraOt => Set<RegistroBitacoraOt>();
    public DbSet<EgresoConsumo> EgresosConsumo => Set<EgresoConsumo>();
    public DbSet<Compra> Compras => Set<Compra>();
    public DbSet<DetalleCompra> DetallesCompra => Set<DetalleCompra>();
    public DbSet<AjusteInventario> AjustesInventario => Set<AjusteInventario>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Mapeo explícito de tablas
        modelBuilder.Entity<UnidadFuncional>().ToTable("unidades_funcionales");
        modelBuilder.Entity<Responsable>().ToTable("responsables");
        modelBuilder.Entity<CategoriaTrabajo>().ToTable("categorias_trabajo");
        modelBuilder.Entity<OrdenTrabajo>().ToTable("ordenes_trabajo");
        modelBuilder.Entity<RegistroBitacoraOt>().ToTable("bitacora_logs");
        modelBuilder.Entity<Categoria>().ToTable("categorias_articulo");
        modelBuilder.Entity<Articulo>().ToTable("articulos");
        modelBuilder.Entity<Compra>().ToTable("compras");
        modelBuilder.Entity<DetalleCompra>().ToTable("detalle_compras");
        modelBuilder.Entity<EgresoConsumo>().ToTable("egresos_consumo");
        modelBuilder.Entity<AjusteInventario>().ToTable("ajustes_inventario");
        modelBuilder.Entity<Usuario>().ToTable("usuarios");
        modelBuilder.Entity<AuditLog>().ToTable("audit_logs");
        modelBuilder.Entity<Empleado>().ToTable("empleados");

        // Articulo
        modelBuilder.Entity<Articulo>()
            .Property(a => a.StockActual)
            .HasPrecision(18, 4);
        modelBuilder.Entity<Articulo>()
            .Property(a => a.StockMinimo)
            .HasPrecision(18, 4);

        // EgresoConsumo
        modelBuilder.Entity<EgresoConsumo>()
            .Property(e => e.Cantidad)
            .HasPrecision(18, 4);

        // DetalleCompra
        modelBuilder.Entity<DetalleCompra>()
            .Property(d => d.CantidadRecibida)
            .HasPrecision(18, 4);

        // AjusteInventario
        modelBuilder.Entity<AjusteInventario>()
            .Property(a => a.Cantidad)
            .HasPrecision(18, 4);

        // UnidadFuncional
        modelBuilder.Entity<UnidadFuncional>()
            .HasKey(u => u.Id);
        modelBuilder.Entity<UnidadFuncional>()
            .HasIndex(u => new { u.SectorEscalera, u.Piso, u.Depto });

        // Responsable
        modelBuilder.Entity<Responsable>()
            .HasKey(r => r.Id);

        // CategoriaTrabajo
        modelBuilder.Entity<CategoriaTrabajo>()
            .HasKey(c => c.Id);

        // OrdenTrabajo
        modelBuilder.Entity<OrdenTrabajo>()
            .HasKey(o => o.Id);

        modelBuilder.Entity<OrdenTrabajo>()
            .HasQueryFilter(o => o.DeletedAt == null);

        modelBuilder.Entity<OrdenTrabajo>()
            .HasOne(o => o.UnidadFuncional)
            .WithMany(u => u.OrdenesTrabajo)
            .HasForeignKey(o => o.UnidadFuncionalId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<OrdenTrabajo>()
            .HasOne(o => o.Responsable)
            .WithMany(r => r.OrdenesTrabajo)
            .HasForeignKey(o => o.ResponsableId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<OrdenTrabajo>()
            .HasOne(o => o.Categoria)
            .WithMany(c => c.OrdenesTrabajo)
            .HasForeignKey(o => o.CategoriaId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<OrdenTrabajo>()
            .HasMany(o => o.Bitacora)
            .WithOne(b => b.OrdenTrabajo)
            .HasForeignKey(b => b.OrdenTrabajoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<OrdenTrabajo>()
            .HasMany(o => o.Egresos)
            .WithOne(e => e.OrdenTrabajo)
            .HasForeignKey(e => e.OrdenTrabajoId)
            .OnDelete(DeleteBehavior.Cascade);

        // Bitacora
        modelBuilder.Entity<RegistroBitacoraOt>()
            .HasKey(b => b.Id);

        // Unique constraints
        modelBuilder.Entity<Usuario>()
            .HasIndex(u => u.Username).IsUnique();
        modelBuilder.Entity<Empleado>()
            .HasIndex(e => e.Legajo).IsUnique();

        // Prevent cascade delete loops
        modelBuilder.Entity<AuditLog>()
            .HasOne(a => a.Usuario)
            .WithMany(u => u.AuditLogs)
            .HasForeignKey(a => a.UsuarioId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<EgresoConsumo>()
            .HasOne(e => e.Usuario)
            .WithMany(u => u.Egresos)
            .HasForeignKey(e => e.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<EgresoConsumo>()
            .HasOne(e => e.Articulo)
            .WithMany(a => a.Egresos)
            .HasForeignKey(e => e.ArticuloId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<EgresoConsumo>()
            .HasOne(e => e.OrdenTrabajo)
            .WithMany(o => o.Egresos)
            .HasForeignKey(e => e.OrdenTrabajoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Compra>()
            .HasOne(c => c.Usuario)
            .WithMany(u => u.Compras)
            .HasForeignKey(c => c.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AjusteInventario>()
            .HasOne(a => a.Usuario)
            .WithMany(u => u.Ajustes)
            .HasForeignKey(a => a.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

