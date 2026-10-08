using System.Text.Json;
using Microsoft.Extensions.Logging;
using Tolif.Application.Interfaces;
using Tolif.Domain.Entities;
using Tolif.Infrastructure.Persistence;

namespace Tolif.Infrastructure.Services;

public class AnalyticsService(
    ApplicationDbContext db,
    ILogger<AnalyticsService> logger) : IAnalyticsService
{
    public async Task TrackAsync(
        string eventType,
        string? sessionId    = null,
        object? data         = null,
        CancellationToken ct = default)
    {
        try
        {
            db.AnalyticsEvents.Add(new AnalyticsEvent
            {
                Id        = Guid.NewGuid(),
                EventType = eventType,
                SessionId = sessionId,
                DataJson  = data is null ? "{}" : JsonSerializer.Serialize(data),
                CreatedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            // Analytics must never crash a request
            logger.LogWarning(ex, "Failed to track analytics event {EventType}", eventType);
        }
    }
}
