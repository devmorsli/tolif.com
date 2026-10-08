using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Tolif.Domain.Enums;
using Tolif.Infrastructure.Persistence;

namespace Tolif.Infrastructure.Jobs;

/// <summary>
/// Nightly job that marks portrait sessions as abandoned when they have been in a
/// non-terminal state for more than 24 hours with no associated paid order.
/// </summary>
public class CleanupOrphanedUploadsJob(
    ApplicationDbContext               db,
    ILogger<CleanupOrphanedUploadsJob> logger)
{
    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        var cutoff = DateTime.UtcNow.AddHours(-24);

        // Session IDs that belong to a paid order — these are NOT orphaned
        var paidSessionIds = await db.OrderItems
            .Where(i => i.Order.Status >= OrderStatus.Paid)
            .Select(i => i.PortraitSessionId)
            .Distinct()
            .ToListAsync(ct);

        var orphaned = await db.PortraitSessions
            .Where(s =>
                s.AbandonedAt == null &&
                s.CreatedAt < cutoff &&
                s.Status != PortraitSessionStatus.Completed &&
                !paidSessionIds.Contains(s.Id))
            .ToListAsync(ct);

        if (orphaned.Count == 0)
        {
            logger.LogInformation("CleanupOrphanedUploadsJob: nothing to clean");
            return;
        }

        var now = DateTime.UtcNow;
        foreach (var session in orphaned)
        {
            session.AbandonedAt = now;
            session.UpdatedAt   = now;
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("CleanupOrphanedUploadsJob: marked {Count} sessions as abandoned", orphaned.Count);
    }
}
