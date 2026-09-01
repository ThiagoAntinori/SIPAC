using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SIPAC.API.Entities;

namespace SIPAC.API.Data;

public class AuditInterceptor : SaveChangesInterceptor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditInterceptor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        var context = eventData.Context;
        if (context == null) return await base.SavingChangesAsync(eventData, result, cancellationToken);

        var httpContext = _httpContextAccessor.HttpContext;
        int? userId = null;
        string? ip = httpContext?.Connection?.RemoteIpAddress?.ToString();

        var userIdClaim = httpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdClaim, out var parsedId))
        {
            userId = parsedId;
        }

        var entries = context.ChangeTracker.Entries()
            .Where(e => e.Entity is not AuditLog && (e.State == EntityState.Added || e.State == EntityState.Modified || e.State == EntityState.Deleted))
            .ToList();

        foreach (var entry in entries)
        {
            var audit = new AuditLog
            {
                UsuarioId = userId,
                Accion = entry.State.ToString(),
                Model = entry.Entity.GetType().Name,
                IP = ip,
                Timestamp = DateTime.UtcNow
            };

            if (entry.State == EntityState.Modified)
            {
                var originalValues = new Dictionary<string, object?>();
                var currentValues = new Dictionary<string, object?>();

                foreach (var prop in entry.OriginalValues.Properties)
                {
                    var original = entry.OriginalValues[prop];
                    var current = entry.CurrentValues[prop];
                    if (!Equals(original, current))
                    {
                        originalValues[prop.Name] = original;
                        currentValues[prop.Name] = current;
                    }
                }

                audit.ValoresAnteriores = JsonSerializer.Serialize(originalValues);
                audit.ValoresNuevos = JsonSerializer.Serialize(currentValues);
            }

            var primaryKey = entry.Properties.FirstOrDefault(p => p.Metadata.IsPrimaryKey());
            if (primaryKey?.CurrentValue != null)
            {
                audit.ModelId = primaryKey.CurrentValue.ToString();
            }

            context.Set<AuditLog>().Add(audit);
        }

        return await base.SavingChangesAsync(eventData, result, cancellationToken);
    }
}
