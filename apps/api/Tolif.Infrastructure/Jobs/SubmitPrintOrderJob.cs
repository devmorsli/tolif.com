using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Tolif.Application.Interfaces;
using Tolif.Domain.Entities;
using Tolif.Domain.Enums;
using Tolif.Infrastructure.Persistence;

namespace Tolif.Infrastructure.Jobs;

/// <summary>
/// Submits a paid, high-res-ready order to the configured print provider.
/// Only runs for orders that contain at least one physical product item.
/// </summary>
public class SubmitPrintOrderJob(
    ApplicationDbContext              db,
    IEnumerable<IPrintProvider>       printProviders,
    ISettingsService                  settings,
    ILogger<SubmitPrintOrderJob>      logger)
{
    public async Task ExecuteAsync(Guid orderId, CancellationToken ct = default)
    {
        logger.LogInformation("SubmitPrintOrderJob starting for order {OrderId}", orderId);

        var order = await db.Orders
            .Include(o => o.Items)
                .ThenInclude(i => i.ProductVariant)
                    .ThenInclude(v => v.Product)
            .Include(o => o.Items)
                .ThenInclude(i => i.PortraitSession)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct);

        if (order is null)
        {
            logger.LogWarning("SubmitPrintOrderJob: order {OrderId} not found", orderId);
            return;
        }

        // Determine which physical items need to be submitted
        var physicalItems = order.Items
            .Where(i => i.ProductVariant?.Product?.Type != ProductType.Digital)
            .ToList();

        if (physicalItems.Count == 0)
        {
            logger.LogInformation("Order {OrderId} has no physical items — skipping print submission", orderId);
            return;
        }

        // Determine provider (admin setting, default Printful)
        var providerName  = await settings.GetAsync("print.activeProvider", ct) ?? "Printful";
        var providerEnum  = Enum.TryParse<PrintProvider>(providerName, out var pe) ? pe : PrintProvider.Printful;
        var provider      = printProviders.FirstOrDefault(p => p.ProviderType == providerEnum)
                            ?? printProviders.First();

        // Build line items — each maps to a final-image presigned URL
        var lineItems = new List<PrintLineItem>();
        foreach (var item in physicalItems)
        {
            var session   = item.PortraitSession;
            var finalKey  = session?.FinalImageKey;

            if (string.IsNullOrEmpty(finalKey))
            {
                logger.LogWarning("Session {SessionId} has no final image — cannot submit to print", session?.Id);
                continue;
            }

            var variantId = provider.ProviderType == PrintProvider.Printful
                ? item.ProductVariant?.PrintfulVariantId
                : item.ProductVariant?.PrintifyVariantId;

            if (string.IsNullOrEmpty(variantId))
            {
                logger.LogWarning("No {Provider} variant ID for variant {VariantId}", provider.ProviderType, item.ProductVariantId);
                continue;
            }

            lineItems.Add(new PrintLineItem(
                ProviderVariantId: variantId,
                Quantity:          item.Quantity,
                PrintFileKey:      finalKey));
        }

        if (lineItems.Count == 0)
        {
            logger.LogWarning("SubmitPrintOrderJob: no submittable items for order {OrderId}", orderId);
            return;
        }

        var printRequest = new PrintOrderRequest(
            OrderId:             order.Id,
            CustomerName:        order.CustomerName ?? order.CustomerEmail,
            CustomerEmail:       order.CustomerEmail,
            ShippingAddressJson: order.ShippingAddressJson ?? "{}",
            LineItems:           lineItems);

        var result = await provider.SubmitOrderAsync(printRequest, ct);

        // Save PrintOrder record
        db.PrintOrders.Add(new PrintOrder
        {
            Id              = Guid.NewGuid(),
            OrderId         = order.Id,
            Provider        = provider.ProviderType,
            ProviderOrderId = result.ProviderOrderId,
            Status          = result.Success ? "submitted" : "failed",
            LastErrorMessage = result.ErrorMessage,
            SubmittedAt     = result.Success ? DateTime.UtcNow : null,
            CreatedAt       = DateTime.UtcNow,
            UpdatedAt       = DateTime.UtcNow,
        });

        if (result.Success)
        {
            order.Status    = OrderStatus.SubmittedToPrinter;
            order.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            logger.LogError("Print submission failed for order {OrderId}: {Error}", orderId, result.ErrorMessage);
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("SubmitPrintOrderJob done for order {OrderId} — success={Success}", orderId, result.Success);
    }
}
