using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.Json.Nodes;
using Tolif.Application.Interfaces;
using Tolif.Domain.Enums;

namespace Tolif.API.Controllers;

[ApiController]
[Route("api/webhooks/printful")]
public class PrintfulWebhookController(
    IApplicationDbContext            db,
    ILogger<PrintfulWebhookController> logger) : ControllerBase
{
    [HttpPost]
    [DisableRequestSizeLimit]
    public async Task<IActionResult> Handle(CancellationToken ct)
    {
        string body;
        using (var reader = new System.IO.StreamReader(Request.Body))
            body = await reader.ReadToEndAsync(ct);

        JsonNode? root;
        try { root = JsonNode.Parse(body); }
        catch { return Ok(); }

        var type = root?["type"]?.GetValue<string>();
        logger.LogInformation("Printful webhook: {Type}", type);

        switch (type)
        {
            case "package_shipped":
                await HandlePackageShipped(root!, ct);
                break;
            case "order_failed":
                await HandleOrderFailed(root!, ct);
                break;
            case "order_canceled":
                await HandleOrderCanceled(root!, ct);
                break;
            default:
                logger.LogDebug("Unhandled Printful event: {Type}", type);
                break;
        }

        return Ok();
    }

    // ── package_shipped ───────────────────────────────────────────────────────

    private async Task HandlePackageShipped(JsonNode root, CancellationToken ct)
    {
        var data     = root["data"];
        var orderId  = data?["order"]?["id"]?.GetValue<long>().ToString()
                    ?? data?["order"]?["external_id"]?.GetValue<string>();
        var tracking = data?["shipment"]?["tracking_number"]?.GetValue<string>();
        var trackUrl = data?["shipment"]?["tracking_url"]?.GetValue<string>();

        if (string.IsNullOrEmpty(orderId)) return;

        var printOrder = await db.PrintOrders
            .Include(p => p.Order)
            .FirstOrDefaultAsync(p => p.ProviderOrderId == orderId, ct);

        if (printOrder is null)
        {
            logger.LogWarning("Printful package_shipped: no PrintOrder for id {Id}", orderId);
            return;
        }

        printOrder.Status         = "shipped";
        printOrder.TrackingNumber = tracking;
        printOrder.TrackingUrl    = trackUrl;

        if (printOrder.Order.Status < OrderStatus.Shipped)
        {
            printOrder.Order.Status    = OrderStatus.Shipped;
            printOrder.Order.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Order {Id} marked shipped, tracking {Tracking}", orderId, tracking);
    }

    // ── order_failed ──────────────────────────────────────────────────────────

    private async Task HandleOrderFailed(JsonNode root, CancellationToken ct)
    {
        var data    = root["data"];
        var orderId = data?["order"]?["id"]?.GetValue<long>().ToString()
                   ?? data?["order"]?["external_id"]?.GetValue<string>();
        var reason  = data?["reason"]?.GetValue<string>()
                   ?? data?["order"]?["error"]?.GetValue<string>();

        if (string.IsNullOrEmpty(orderId)) return;

        var printOrder = await db.PrintOrders
            .FirstOrDefaultAsync(p => p.ProviderOrderId == orderId, ct);

        if (printOrder is null)
        {
            logger.LogWarning("Printful order_failed: no PrintOrder for id {Id}", orderId);
            return;
        }

        printOrder.Status           = "failed";
        printOrder.LastErrorMessage = reason;

        await db.SaveChangesAsync(ct);
        logger.LogWarning("Printful order {Id} failed: {Reason}", orderId, reason);
    }

    // ── order_canceled ────────────────────────────────────────────────────────

    private async Task HandleOrderCanceled(JsonNode root, CancellationToken ct)
    {
        var data    = root["data"];
        var orderId = data?["order"]?["id"]?.GetValue<long>().ToString()
                   ?? data?["order"]?["external_id"]?.GetValue<string>();

        if (string.IsNullOrEmpty(orderId)) return;

        var printOrder = await db.PrintOrders
            .Include(p => p.Order)
            .FirstOrDefaultAsync(p => p.ProviderOrderId == orderId, ct);

        if (printOrder is null)
        {
            logger.LogWarning("Printful order_canceled: no PrintOrder for id {Id}", orderId);
            return;
        }

        printOrder.Status = "canceled";

        if (printOrder.Order.Status < OrderStatus.Shipped)
        {
            printOrder.Order.Status    = OrderStatus.Cancelled;
            printOrder.Order.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Printful order {Id} canceled", orderId);
    }
}
