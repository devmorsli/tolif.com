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
public class OrdersController(IApplicationDbContext db) : ControllerBase
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

    // ── Private helpers ───────────────────────────────────────────────────────
    private static string MaskEmail(string email)
    {
        var at = email.IndexOf('@');
        if (at <= 1) return email;
        return email[0] + new string('*', Math.Max(1, at - 2)) + email[(at - 1)..];
    }
}
