using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tolif.Application.Helpers;
using Tolif.Application.Interfaces;

namespace Tolif.API.Controllers;

/// <summary>
/// Public (no auth) customer order endpoint.
/// Access is guarded by the unguessable AccessToken stored on the Order.
/// </summary>
[ApiController]
[Route("api/orders")]
public class OrdersController(IApplicationDbContext db, IStorageService storage) : ControllerBase
{
    // ── GET /api/orders/{accessToken} ─────────────────────────────────────────
    /// <summary>
    /// Returns order details for the customer-facing thank-you / download page.
    /// No authentication — the 32-hex AccessToken acts as the secret.
    /// </summary>
    [HttpGet("{accessToken}")]
    public async Task<IActionResult> GetByToken(string accessToken, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(accessToken) || accessToken.Length < 16)
            return BadRequest(new { message = "Invalid access token." });

        var order = await db.Orders
            .Include(o => o.Items)
                .ThenInclude(i => i.ProductVariant)
                    .ThenInclude(v => v!.Product)
            .Include(o => o.Items)
                .ThenInclude(i => i.PortraitSession)
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.AccessToken == accessToken, ct);

        if (order is null)
            return NotFound(new { message = "Order not found." });

        // Parse shipping address if present
        object? shippingAddress = null;
        if (!string.IsNullOrWhiteSpace(order.ShippingAddressJson))
        {
            try { shippingAddress = JsonSerializer.Deserialize<JsonElement>(order.ShippingAddressJson); }
            catch { /* ignore bad JSON */ }
        }

        var items = order.Items.Select(i => new
        {
            id            = i.Id,
            productName   = i.ProductVariant?.Product?.Name ?? "Portrait",
            productType   = i.ProductVariant?.Product?.Type.ToString() ?? "Digital",
            size          = i.ProductVariant?.Size ?? "",
            quantity      = i.Quantity,
            unitPrice     = i.UnitPrice,
            currency      = i.Currency,
            // Client uses sessionId to build the preview image URL
            sessionId     = i.PortraitSession?.Id as Guid?,
            hasPreview    = i.PortraitSession?.WatermarkedPreviewKey != null,
            hasFinalImage = i.PortraitSession?.FinalImageKey != null,
        }).ToList();

        return Ok(new
        {
            orderNumber     = OrderHelper.FormatNumber(order),
            createdAt       = order.CreatedAt,
            status          = order.Status.ToString(),
            customerName    = order.CustomerName,
            // Expose only enough of the email to confirm (privacy)
            customerEmail   = MaskEmail(order.CustomerEmail),
            items,
            totalAmount     = order.TotalAmount,
            currency        = order.Currency,
            shippingAddress,
            hasDigital      = order.Items.Any(i =>
                i.ProductVariant?.Product?.Type == Domain.Enums.ProductType.Digital
                || i.ProductVariant?.Product?.Name?.Contains("Digital", StringComparison.OrdinalIgnoreCase) == true),
        });
    }

    // ── GET /api/orders/{accessToken}/download/{sessionId} ────────────────────
    /// <summary>
    /// Streams the final (watermark-free) portrait through the API so the browser
    /// receives Content-Disposition: attachment and saves it as a file instead of
    /// opening it in a new tab.
    /// Only works for paid orders that have a final image generated.
    /// </summary>
    [HttpGet("{accessToken}/download/{sessionId:guid}")]
    public async Task<IActionResult> Download(string accessToken, Guid sessionId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(accessToken) || accessToken.Length < 16)
            return BadRequest(new { message = "Invalid access token." });

        var order = await db.Orders
            .Include(o => o.Items)
                .ThenInclude(i => i.PortraitSession)
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.AccessToken == accessToken, ct);

        if (order is null)
            return NotFound(new { message = "Order not found." });

        // Must be paid
        var paidStatuses = new[]
        {
            Domain.Enums.OrderStatus.Paid,
            Domain.Enums.OrderStatus.GeneratingHighRes,
            Domain.Enums.OrderStatus.Ready,
            Domain.Enums.OrderStatus.SubmittedToPrinter,
            Domain.Enums.OrderStatus.Shipped,
        };
        if (!paidStatuses.Contains(order.Status))
            return BadRequest(new { message = "Order has not been paid." });

        // Session must belong to this order
        var item = order.Items.FirstOrDefault(i => i.PortraitSessionId == sessionId);
        if (item is null)
            return NotFound(new { message = "Session not found in this order." });

        var finalKey = item.PortraitSession?.FinalImageKey;
        if (string.IsNullOrEmpty(finalKey))
            return NotFound(new { message = "High-resolution file is not ready yet. Please try again in a moment." });

        // Stream the file through the API with Content-Disposition: attachment so
        // the browser saves it instead of displaying it.  Using the storage service
        // directly avoids an extra redirect round-trip and works regardless of
        // whether MinIO is publicly reachable from the browser.
        var bytes = await storage.DownloadAsync(finalKey, ct);
        var fileName = $"tolif-portrait-{sessionId:N}.jpg";
        return File(bytes, "image/jpeg", fileName);
    }

    // ── Private helpers ───────────────────────────────────────────────────────
    private static string MaskEmail(string email)
    {
        var at = email.IndexOf('@');
        if (at <= 1) return email;
        return email[0] + new string('*', Math.Max(1, at - 2)) + email[(at - 1)..];
    }
}
