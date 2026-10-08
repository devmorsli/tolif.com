using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Tolif.Application.Interfaces;
using Tolif.Domain.Enums;
using Tolif.Infrastructure.Persistence;

namespace Tolif.Infrastructure.Jobs;

/// <summary>
/// Nightly GDPR cleanup job.
/// Deletes uploaded customer photos from S3 after the configured retention period:
///   - Paid orders:        30 days (configurable via "gdpr.retentionDaysPaid")
///   - Abandoned sessions:  7 days (configurable via "gdpr.retentionDaysAbandoned")
/// </summary>
public class DeleteExpiredPhotosJob(
    ApplicationDbContext            db,
    IStorageService                 storageService,
    ISettingsService                settings,
    ILogger<DeleteExpiredPhotosJob> logger)
{
    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        var retentionPaid      = await settings.GetAsync<int>("gdpr.retentionDaysPaid",      ct) ?? 30;
        var retentionAbandoned = await settings.GetAsync<int>("gdpr.retentionDaysAbandoned", ct) ?? 7;

        var now            = DateTime.UtcNow;
        var paidCutoff     = now.AddDays(-retentionPaid);
        var abandonedCutoff = now.AddDays(-retentionAbandoned);

        // Sessions linked to paid orders older than retentionPaid days
        var paidSessionIds = await db.OrderItems
            .Where(i => i.Order.Status >= OrderStatus.Paid && i.Order.CreatedAt < paidCutoff)
            .Select(i => i.PortraitSessionId)
            .Distinct()
            .ToListAsync(ct);

        var paidSessions = await db.PortraitSessions
            .Where(s => s.PhotosDeletedAt == null && paidSessionIds.Contains(s.Id))
            .ToListAsync(ct);

        // Orphan sessions (no paid order) older than retentionAbandoned days
        var linkedSessionIds = await db.OrderItems
            .Where(i => i.Order.Status >= OrderStatus.Paid)
            .Select(i => i.PortraitSessionId)
            .Distinct()
            .ToListAsync(ct);

        var abandonedSessions = await db.PortraitSessions
            .Where(s =>
                s.PhotosDeletedAt == null &&
                s.CreatedAt < abandonedCutoff &&
                !linkedSessionIds.Contains(s.Id))
            .ToListAsync(ct);

        var allSessions = paidSessions.Concat(abandonedSessions).ToList();
        logger.LogInformation("DeleteExpiredPhotosJob: {Count} sessions to clean up", allSessions.Count);

        foreach (var session in allSessions)
        {
            try
            {
                if (!string.IsNullOrEmpty(session.UploadedFilesJson) &&
                    session.UploadedFilesJson != "{}")
                {
                    var keys = System.Text.Json.JsonSerializer
                        .Deserialize<Dictionary<string, string>>(session.UploadedFilesJson) ?? [];

                    foreach (var key in keys.Values)
                    {
                        try { await storageService.DeleteAsync(key, ct); }
                        catch (Exception ex)
                        {
                            logger.LogWarning(ex, "Could not delete S3 key {Key}", key);
                        }
                    }
                }

                session.UploadedFilesJson = "{}";
                session.PhotosDeletedAt   = now;
                session.UpdatedAt         = now;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error cleaning up session {SessionId}", session.Id);
            }
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("DeleteExpiredPhotosJob: cleaned {Count} sessions", allSessions.Count);
    }
}
