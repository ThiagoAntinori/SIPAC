using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SIPAC.API.Data;
using SIPAC.API.Services;

// ── Carga de variables de entorno desde .env ──────────────────────────────────
LoadDotEnv();

var builder = WebApplication.CreateBuilder(args);

// ── Port Binding (Render / Cloud Containers) ─────────────────────────────────
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    Console.WriteLine($"[Config] Vinculando Kestrel al puerto dinámico: {port}");
    builder.WebHost.UseUrls($"http://*:{port}");
}

// ── Database ────────────────────────────────────────────────────────────────
var env = builder.Environment.EnvironmentName;
var isProduction = builder.Environment.IsProduction();

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<AuditInterceptor>();

var rawDatabaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("DefaultConnection");

var npgsqlConnection = ConvertPostgresUriToNpgsql(rawDatabaseUrl);

var tursoUrl = Environment.GetEnvironmentVariable("TURSO_DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("TursoConnection");
var tursoToken = Environment.GetEnvironmentVariable("TURSO_AUTH_TOKEN");

builder.Services.AddDbContext<SipacDbContext>((sp, options) =>
{
    var interceptor = sp.GetRequiredService<AuditInterceptor>();
    options.AddInterceptors(interceptor);

    // 1. Prioridad: Turso Cloud (libSQL)
    if (!string.IsNullOrWhiteSpace(tursoUrl))
    {
        var rawUrl = tursoUrl.Trim();
        if (rawUrl.StartsWith("libsql://", StringComparison.OrdinalIgnoreCase))
        {
            rawUrl = "https://" + rawUrl.Substring("libsql://".Length);
        }
        else if (!rawUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) && !rawUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            rawUrl = "https://" + rawUrl;
        }

        var uri = new Uri(rawUrl);
        var baseUrl = $"{uri.Scheme}://{uri.Authority}";
        var connString = $"{baseUrl}/v2/pipeline;{tursoToken?.Trim()}";

        Console.WriteLine($"[Database] Conectando a Turso Cloud (libSQL): {baseUrl}/v2/pipeline");
        options.UseLibSql(connString);
    }
    // 2. PostgreSQL (Supabase / Render)
    else if (!string.IsNullOrWhiteSpace(npgsqlConnection) && (isProduction || Environment.GetEnvironmentVariable("DATABASE_URL") != null))
    {
        options.UseNpgsql(npgsqlConnection);
    }
    // 3. Fallback: SQLite local en disco
    else
    {
        options.UseSqlite(builder.Configuration.GetConnectionString("SqliteConnection") ?? "Data Source=sipac_dev.db");
    }
});

// ── JWT Authentication ───────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? Environment.GetEnvironmentVariable("JWT__SECRET")
    ?? "SIPAC_DEV_SECRET_KEY_CHANGE_IN_PRODUCTION_32CHARS!";
var key = Encoding.UTF8.GetBytes(jwtSecret);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "sipac-api",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "sipac-web",
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ClockSkew = TimeSpan.Zero
        };

        // Compatibilidad con errores descriptivos
        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                if (context.Exception is SecurityTokenExpiredException)
                    context.Response.Headers.Append("Token-Expired", "true");
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// ── Services ─────────────────────────────────────────────────────────────────
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<StockAlertService>();
builder.Services.AddSingleton<CloudStorageService>();
builder.Services.AddSingleton<NotificacionService>();
builder.Services.AddHttpClient();

// ── CORS ─────────────────────────────────────────────────────────────────────
var allowedOriginsEnv = Environment.GetEnvironmentVariable("ALLOWED_ORIGINS");
var defaultOrigins = new[] { "http://localhost:5173", "http://localhost:3000", "http://localhost:4173" };
var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? defaultOrigins;

var allowedOrigins = !string.IsNullOrWhiteSpace(allowedOriginsEnv)
    ? allowedOriginsEnv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    : configuredOrigins;

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (allowedOrigins.Contains("*"))
        {
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
        else
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

// ── Swagger / OpenAPI ─────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "SIPAC API",
        Version = "v1",
        Description = "Sistema Integral de Pañol y Abastecimiento para Consorcios"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Ingrese: Bearer {token}",
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddControllers();

var app = builder.Build();

// ── Middleware pipeline ───────────────────────────────────────────────────────
var enableSwagger = builder.Configuration.GetValue<bool>("EnableSwagger", false)
    || string.Equals(Environment.GetEnvironmentVariable("ENABLE_SWAGGER"), "true", StringComparison.OrdinalIgnoreCase);

if (app.Environment.IsDevelopment() || app.Environment.IsStaging() || enableSwagger)
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "SIPAC API v1");
        c.RoutePrefix = "swagger";
    });
}

// ── Health checks para Render y orquestadores ─────────────────────────────────
app.MapGet("/healthz", () => Results.Ok(new { status = "healthy", service = "SIPAC API", timestamp = DateTime.UtcNow }));
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", service = "SIPAC API", timestamp = DateTime.UtcNow }));

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ── Servir archivos del frontend (para despliegue integrado) ──────────────────
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");

// ── Seed de datos ─────────────────────────────────────────────────────────────
await SeedData.InitializeAsync(app.Services);

app.Run();

// ── Helpers ──────────────────────────────────────────────────────────────────
static void LoadDotEnv()
{
    var currentDir = Directory.GetCurrentDirectory();
    var candidates = new[]
    {
        Path.Combine(currentDir, ".env"),
        Path.Combine(currentDir, "..", ".env"),
        Path.Combine(AppContext.BaseDirectory, ".env"),
        Path.Combine(AppContext.BaseDirectory, "..", "..", "..", ".env"),
        Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".env")
    };

    foreach (var path in candidates)
    {
        try
        {
            var fullPath = Path.GetFullPath(path);
            if (File.Exists(fullPath))
            {
                Console.WriteLine($"[Config] Cargando variables desde: {fullPath}");
                foreach (var line in File.ReadAllLines(fullPath))
                {
                    var trimmed = line.Trim();
                    if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith('#')) continue;
                    var parts = trimmed.Split('=', 2);
                    if (parts.Length == 2)
                    {
                        var key = parts[0].Trim();
                        var val = parts[1].Trim().Trim('"', '\'');
                        Environment.SetEnvironmentVariable(key, val);
                    }
                }
                break;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Config] Aviso al leer {path}: {ex.Message}");
        }
    }
}

static string? ConvertPostgresUriToNpgsql(string? connectionString)
{
    if (string.IsNullOrWhiteSpace(connectionString)) return null;

    var trimmed = connectionString.Trim().Trim('"', '\'');

    // Si ya viene en formato de pares clave=valor estándar de ADO.NET / Npgsql
    if (trimmed.Contains("Host=", StringComparison.OrdinalIgnoreCase) ||
        trimmed.Contains("Server=", StringComparison.OrdinalIgnoreCase))
    {
        return trimmed;
    }

    if (trimmed.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
        trimmed.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        try
        {
            // Quitar el prefijo del esquema
            var withoutScheme = trimmed.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase)
                ? trimmed.Substring("postgresql://".Length)
                : trimmed.Substring("postgres://".Length);

            // Encontrar el último '@' que separa las credenciales del host
            var lastAtIndex = withoutScheme.LastIndexOf('@');
            if (lastAtIndex > 0)
            {
                var credentialsPart = withoutScheme.Substring(0, lastAtIndex);
                var hostPart = withoutScheme.Substring(lastAtIndex + 1);

                // Separar username y password (el password puede contener ':', '/', '&', '?', etc.)
                var colonIndex = credentialsPart.IndexOf(':');
                var username = colonIndex >= 0 ? credentialsPart.Substring(0, colonIndex) : credentialsPart;
                var password = colonIndex >= 0 ? credentialsPart.Substring(colonIndex + 1) : "";

                // Decodificar si estuviera URL-encoded
                username = Uri.UnescapeDataString(username);
                password = Uri.UnescapeDataString(password);

                // Separar host, puerto, base de datos y parámetros
                var slashIndex = hostPart.IndexOf('/');
                var hostAndPort = slashIndex >= 0 ? hostPart.Substring(0, slashIndex) : hostPart;
                var dbAndQuery = slashIndex >= 0 ? hostPart.Substring(slashIndex + 1) : "postgres";

                var queryIndex = dbAndQuery.IndexOf('?');
                var database = queryIndex >= 0 ? dbAndQuery.Substring(0, queryIndex) : dbAndQuery;
                if (string.IsNullOrWhiteSpace(database)) database = "postgres";

                var host = hostAndPort;
                var port = 5432;

                var colonHostIndex = hostAndPort.LastIndexOf(':');
                if (colonHostIndex >= 0)
                {
                    host = hostAndPort.Substring(0, colonHostIndex);
                    if (int.TryParse(hostAndPort.Substring(colonHostIndex + 1), out var parsedPort))
                    {
                        port = parsedPort;
                    }
                }

                var isSslDisabled = trimmed.Contains("sslmode=disable", StringComparison.OrdinalIgnoreCase);
                var builder = new Npgsql.NpgsqlConnectionStringBuilder
                {
                    Host = host,
                    Port = port,
                    Database = database,
                    Username = username,
                    Password = password,
                    SslMode = isSslDisabled ? Npgsql.SslMode.Disable : Npgsql.SslMode.Prefer,
                    Pooling = true
                };

                Console.WriteLine($"[Database] Conectando a PostgreSQL ({builder.Host}:{builder.Port}/{builder.Database}) como usuario '{builder.Username}' (SslMode={builder.SslMode})");
                return builder.ConnectionString;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Database] Error al procesar DATABASE_URL: {ex.Message}");
        }
    }

    return trimmed;
}

