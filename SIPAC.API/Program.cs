using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SIPAC.API.Data;
using SIPAC.API.Services;

var builder = WebApplication.CreateBuilder(args);

// ── Database ────────────────────────────────────────────────────────────────
var env = builder.Environment.EnvironmentName;
var isProduction = builder.Environment.IsProduction();

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<AuditInterceptor>();

builder.Services.AddDbContext<SipacDbContext>((sp, options) =>
{
    var interceptor = sp.GetRequiredService<AuditInterceptor>();
    options.AddInterceptors(interceptor);

    if (isProduction)
    {
        // PostgreSQL para producción (Render / Supabase)
        options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
    }
    else
    {
        // SQLite para desarrollo local — cero configuración
        options.UseSqlite(builder.Configuration.GetConnectionString("SqliteConnection") ?? "Data Source=sipac.db");
    }
});

// ── JWT Authentication ───────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "SIPAC_DEV_SECRET_KEY_CHANGE_IN_PRODUCTION_32CHARS!";
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
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5173", "http://localhost:3000", "http://localhost:4173" };

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
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
if (app.Environment.IsDevelopment() || app.Environment.IsStaging())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "SIPAC API v1");
        c.RoutePrefix = "swagger";
    });
}

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
