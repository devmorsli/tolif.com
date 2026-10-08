using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Tolif.Application.Interfaces;
using Tolif.Domain.Entities;
using Tolif.Domain.Enums;
using Tolif.Infrastructure.Persistence;

namespace Tolif.Infrastructure.Jobs;

/// <summary>
/// Triggered after payment confirmed.
/// Re-runs AI generation at full resolution, saves the clean (unwatermarked) final image,
/// then enqueues SubmitPrintOrderJob for any physical items.
/// </summary>
public class GenerateHighResJob(
    ApplicationDbContext         db,
    IImageGenerationProvider     imageGenerationProvider,
    IStorageService              storageService,
    IOrderEmailService           orderEmail,
    ILogger<GenerateHighResJob>  logger)
{
    public async Task ExecuteAsync(Guid orderId, CancellationToken ct = default)
    {
        logger.LogInformation("GenerateHighResJob starting for order {OrderId}", orderId);

        var order = await db.Orders
            .Include(o => o.Items)
                .ThenInclude(i => i.PortraitSession)
                    .ThenInclude(s => s.Template)
            .Include(o => o.Items)
                .ThenInclude(i => i.ProductVariant)
                    .ThenInclude(v => v.Product)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct);

        if (order is null)
        {
            logger.LogWarning("GenerateHighResJob: order {OrderId} not found", orderId);
            return;
        }

        // Set status
        order.Status    = OrderStatus.GeneratingHighRes;
        order.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        var anyFailed = false;

        foreach (var item in order.Items)
        {
            var session = item.PortraitSession;
            if (session is null) continue;

            // Skip if high-res already generated
            if (!string.IsNullOrEmpty(session.FinalImageKey)) continue;

            var uploadedKeys = JsonSerializer.Deserialize<Dictionary<string, string>>(
                session.UploadedFilesJson) ?? [];

            if (uploadedKeys.Count == 0 || session.Template is null)
            {
                logger.LogWarning("Session {SessionId} has no uploaded files or template", session.Id);
                anyFailed = true;
                continue;
            }

            var genRequest = new GenerationRequest(
                SessionId:         session.Id,
                TemplateImageKey:  session.Template.TemplateImageKey ?? "",
                Prompt:            session.Template.Prompt ?? session.Template.Name,
                UploadedImageKeys: [.. uploadedKeys.Values],
                IsHighRes:         true);

            var result = await imageGenerationProvider.GenerateAsync(genRequest, ct);

            // Log generation
            db.AiGenerationLogs.Add(new AiGenerationLog
            {
                Id                = Guid.NewGuid(),
                PortraitSessionId = session.Id,
                Provider          = imageGenerationProvider.ProviderType,
                Model             = "high-res",
                Status            = result.Status,
                DurationMs        = result.DurationMs,
                ErrorMessage      = result.ErrorMessage,
                CreatedAt         = DateTime.UtcNow,
            });

            if (!result.Success || result.ImageData is null)
            {
                logger.LogError("High-res generation failed for session {SessionId}: {Error}",
                    session.Id, result.ErrorMessage);
                anyFailed = true;
                continue;
            }

            // Save clean (unwatermarked) high-res image
            var finalKey = $"portraits/{session.Id}/final.jpg";
            await storageService.UploadAsync(finalKey, result.ImageData, "image/jpeg", ct);

            session.FinalImageKey = finalKey;
            session.Status        = PortraitSessionStatus.Completed;
            session.UpdatedAt     = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);

        if (anyFailed)
        {
            logger.LogError("GenerateHighResJob: one or more sessions failed for order {OrderId}", orderId);
            return;
        }

        order.Status    = OrderStatus.Ready;
        order.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        logger.LogInformation("GenerateHighResJob completed for order {OrderId}", orderId);

        // Send "portrait ready" email
        try { await orderEmail.SendOrderConfirmationAsync(order, ct); }
        catch (Exception ex) { logger.LogError(ex, "Failed to send ready email for order {OrderId}", orderId); }
    }
}
