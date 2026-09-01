using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SIPAC.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreateBasiFix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Categorias",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Nombre = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categorias", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "categorias_trabajo",
                columns: table => new
                {
                    id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    nombre = table.Column<string>(type: "TEXT", nullable: false),
                    activo = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_categorias_trabajo", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "Empleados",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    NombreCompleto = table.Column<string>(type: "TEXT", nullable: false),
                    Legajo = table.Column<string>(type: "TEXT", nullable: false),
                    PuestoSector = table.Column<string>(type: "TEXT", nullable: false),
                    Activo = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Empleados", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "responsables",
                columns: table => new
                {
                    id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    nombre = table.Column<string>(type: "TEXT", nullable: false),
                    activo = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_responsables", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "unidades_funcionales",
                columns: table => new
                {
                    id = table.Column<long>(type: "INTEGER", nullable: false),
                    sector_escalera = table.Column<string>(type: "TEXT", nullable: false),
                    piso = table.Column<string>(type: "TEXT", nullable: true),
                    depto = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_unidades_funcionales", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "Usuarios",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    NombreCompleto = table.Column<string>(type: "TEXT", nullable: false),
                    Username = table.Column<string>(type: "TEXT", nullable: false),
                    PasswordHash = table.Column<string>(type: "TEXT", nullable: false),
                    Rol = table.Column<string>(type: "TEXT", nullable: false),
                    Activo = table.Column<bool>(type: "INTEGER", nullable: false),
                    RefreshToken = table.Column<string>(type: "TEXT", nullable: true),
                    RefreshTokenExpiryTime = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Usuarios", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Articulos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Nombre = table.Column<string>(type: "TEXT", nullable: false),
                    CategoriaId = table.Column<int>(type: "INTEGER", nullable: false),
                    UnidadMedida = table.Column<string>(type: "TEXT", nullable: false),
                    EsFraccionable = table.Column<bool>(type: "INTEGER", nullable: false),
                    StockActual = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    StockMinimo = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    Activo = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Articulos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Articulos_Categorias_CategoriaId",
                        column: x => x.CategoriaId,
                        principalTable: "Categorias",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ordenes_trabajo",
                columns: table => new
                {
                    id_ot = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    unidad_funcional_id = table.Column<long>(type: "INTEGER", nullable: false),
                    responsable_id = table.Column<long>(type: "INTEGER", nullable: false),
                    categoria_id = table.Column<long>(type: "INTEGER", nullable: false),
                    problema_reportado = table.Column<string>(type: "TEXT", nullable: false),
                    solucion_realizada = table.Column<string>(type: "TEXT", nullable: true),
                    estado = table.Column<string>(type: "TEXT", nullable: false),
                    observaciones = table.Column<string>(type: "TEXT", nullable: true),
                    created_at = table.Column<DateTime>(type: "TEXT", nullable: false),
                    updated_at = table.Column<DateTime>(type: "TEXT", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ordenes_trabajo", x => x.id_ot);
                    table.ForeignKey(
                        name: "FK_ordenes_trabajo_categorias_trabajo_categoria_id",
                        column: x => x.categoria_id,
                        principalTable: "categorias_trabajo",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ordenes_trabajo_responsables_responsable_id",
                        column: x => x.responsable_id,
                        principalTable: "responsables",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ordenes_trabajo_unidades_funcionales_unidad_funcional_id",
                        column: x => x.unidad_funcional_id,
                        principalTable: "unidades_funcionales",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UsuarioId = table.Column<int>(type: "INTEGER", nullable: true),
                    Accion = table.Column<string>(type: "TEXT", nullable: false),
                    Model = table.Column<string>(type: "TEXT", nullable: false),
                    ModelId = table.Column<long>(type: "INTEGER", nullable: true),
                    ValoresAnteriores = table.Column<string>(type: "TEXT", nullable: true),
                    ValoresNuevos = table.Column<string>(type: "TEXT", nullable: true),
                    IP = table.Column<string>(type: "TEXT", nullable: true),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AuditLogs_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Compras",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    NroComprobante = table.Column<string>(type: "TEXT", nullable: false),
                    FechaCompra = table.Column<DateTime>(type: "TEXT", nullable: false),
                    FechaCarga = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UsuarioId = table.Column<int>(type: "INTEGER", nullable: false),
                    FotoComprobanteUrl = table.Column<string>(type: "TEXT", nullable: true),
                    ObservacionesDiferencia = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Compras", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Compras_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AjustesInventario",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ArticuloId = table.Column<int>(type: "INTEGER", nullable: false),
                    Cantidad = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    Motivo = table.Column<string>(type: "TEXT", nullable: false),
                    Justificacion = table.Column<string>(type: "TEXT", nullable: false),
                    TipoAjuste = table.Column<string>(type: "TEXT", nullable: false),
                    FechaHora = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UsuarioId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AjustesInventario", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AjustesInventario_Articulos_ArticuloId",
                        column: x => x.ArticuloId,
                        principalTable: "Articulos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AjustesInventario_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "egresos_consumo",
                columns: table => new
                {
                    id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    articulo_id = table.Column<int>(type: "INTEGER", nullable: false),
                    orden_trabajo_id = table.Column<long>(type: "INTEGER", nullable: false),
                    cantidad = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false),
                    fecha_hora = table.Column<DateTime>(type: "TEXT", nullable: false),
                    usuario_id = table.Column<int>(type: "INTEGER", nullable: false),
                    observacion = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_egresos_consumo", x => x.id);
                    table.ForeignKey(
                        name: "FK_egresos_consumo_Articulos_articulo_id",
                        column: x => x.articulo_id,
                        principalTable: "Articulos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_egresos_consumo_Usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_egresos_consumo_ordenes_trabajo_orden_trabajo_id",
                        column: x => x.orden_trabajo_id,
                        principalTable: "ordenes_trabajo",
                        principalColumn: "id_ot",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "registro_bitacora_ot",
                columns: table => new
                {
                    id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    orden_trabajo_id = table.Column<long>(type: "INTEGER", nullable: false),
                    tipo_operacion = table.Column<string>(type: "TEXT", nullable: false),
                    detalle_cambio = table.Column<string>(type: "TEXT", nullable: false),
                    fecha_hora = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_registro_bitacora_ot", x => x.id);
                    table.ForeignKey(
                        name: "FK_registro_bitacora_ot_ordenes_trabajo_orden_trabajo_id",
                        column: x => x.orden_trabajo_id,
                        principalTable: "ordenes_trabajo",
                        principalColumn: "id_ot",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DetallesCompra",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    CompraId = table.Column<int>(type: "INTEGER", nullable: false),
                    ArticuloId = table.Column<int>(type: "INTEGER", nullable: false),
                    CantidadRecibida = table.Column<decimal>(type: "TEXT", precision: 18, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DetallesCompra", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DetallesCompra_Articulos_ArticuloId",
                        column: x => x.ArticuloId,
                        principalTable: "Articulos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DetallesCompra_Compras_CompraId",
                        column: x => x.CompraId,
                        principalTable: "Compras",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AjustesInventario_ArticuloId",
                table: "AjustesInventario",
                column: "ArticuloId");

            migrationBuilder.CreateIndex(
                name: "IX_AjustesInventario_UsuarioId",
                table: "AjustesInventario",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_Articulos_CategoriaId",
                table: "Articulos",
                column: "CategoriaId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_UsuarioId",
                table: "AuditLogs",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_Compras_UsuarioId",
                table: "Compras",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_DetallesCompra_ArticuloId",
                table: "DetallesCompra",
                column: "ArticuloId");

            migrationBuilder.CreateIndex(
                name: "IX_DetallesCompra_CompraId",
                table: "DetallesCompra",
                column: "CompraId");

            migrationBuilder.CreateIndex(
                name: "IX_egresos_consumo_articulo_id",
                table: "egresos_consumo",
                column: "articulo_id");

            migrationBuilder.CreateIndex(
                name: "IX_egresos_consumo_orden_trabajo_id",
                table: "egresos_consumo",
                column: "orden_trabajo_id");

            migrationBuilder.CreateIndex(
                name: "IX_egresos_consumo_usuario_id",
                table: "egresos_consumo",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_Empleados_Legajo",
                table: "Empleados",
                column: "Legajo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ordenes_trabajo_categoria_id",
                table: "ordenes_trabajo",
                column: "categoria_id");

            migrationBuilder.CreateIndex(
                name: "IX_ordenes_trabajo_responsable_id",
                table: "ordenes_trabajo",
                column: "responsable_id");

            migrationBuilder.CreateIndex(
                name: "IX_ordenes_trabajo_unidad_funcional_id",
                table: "ordenes_trabajo",
                column: "unidad_funcional_id");

            migrationBuilder.CreateIndex(
                name: "IX_registro_bitacora_ot_orden_trabajo_id",
                table: "registro_bitacora_ot",
                column: "orden_trabajo_id");

            migrationBuilder.CreateIndex(
                name: "IX_unidades_funcionales_sector_escalera_piso_depto",
                table: "unidades_funcionales",
                columns: new[] { "sector_escalera", "piso", "depto" });

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_Username",
                table: "Usuarios",
                column: "Username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AjustesInventario");

            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropTable(
                name: "DetallesCompra");

            migrationBuilder.DropTable(
                name: "egresos_consumo");

            migrationBuilder.DropTable(
                name: "Empleados");

            migrationBuilder.DropTable(
                name: "registro_bitacora_ot");

            migrationBuilder.DropTable(
                name: "Compras");

            migrationBuilder.DropTable(
                name: "Articulos");

            migrationBuilder.DropTable(
                name: "ordenes_trabajo");

            migrationBuilder.DropTable(
                name: "Usuarios");

            migrationBuilder.DropTable(
                name: "Categorias");

            migrationBuilder.DropTable(
                name: "categorias_trabajo");

            migrationBuilder.DropTable(
                name: "responsables");

            migrationBuilder.DropTable(
                name: "unidades_funcionales");
        }
    }
}
