using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Tolif.Application.Interfaces;
using Tolif.Infrastructure.Persistence;

namespace Tolif.Infrastructure.Jobs;

/// <summary>
/// Sends the order confirmation email. Runs as a Hangfire background job so
/// the Stripe webhook can return 200 immediately without waiting for SMTP.
/// </summary>
public class SendOrderEmailJob(
    ApplicationDbContext         db,
    IOrderEmailService           orderEmail,
    ILogger<SendOrderEmailJob>   logger)
{
    public async Task ExecuteAsync(Guid orderId, CancellationToken ct = default)
    {
        var order = await db.Orders
            .Include(o => o.Items).ThenInclude(i => i.ProductVariant).ThenInclude(v => v.Product)
            .Include(o => o.Items).ThenInclude(i => i.PortraitSession)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct);

        if (order is null)
        {
            logger.LogWarning("SendOrderEmailJob: order {OrderId} not found", orderId);
            return;
        }

        try
        {
            await orderEmail.SendOrderConfirmationAsync(order, ct);
            logger.LogInformation("Confirmation email sent for order {OrderId}", orderId);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send confirmation email for order {OrderId}", orderId);
            throw; // Allow Hangfire to retry
        }
    }
}
