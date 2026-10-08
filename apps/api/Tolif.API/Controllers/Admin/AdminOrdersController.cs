using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tolif.Application.Helpers;
using Tolif.Application.Interfaces;
using Tolif.Domain.Enums;

namespace Tolif.API.Controllers.Admin;

[ApiController]
[Route("api/admin/orders")]
[Authorize(Roles = "Admin")]
public class AdminOrdersController(
    IApplicationDbContext db,
    IOrderEmailService    orderEmail) : ControllerBase
{
    // ── GET /api/admin/orders ─────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Orders.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<OrderStatus>(status, ignoreCase: true, out var parsedStatus))
            query = query.Where(o => o.Status == parsedStatus);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(o => o.CustomerEmail.Contains(search)
                                  || (o.CustomerName != null && o.CustomerName.Contains(search))
                                  || (o.StripePaymentIntentId != null && o.StripePaymentIntentId.Contains(search)));

        var total = await query.CountAsync(ct);

        var raw = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new
            {
                o.Id,
                o.CustomerEmail,
                o.CustomerName,
                status        = o.Status.ToString(),
                o.TotalAmount,
                o.Currency,
                o.CreatedAt,
            })
            .ToListAsync(ct);

        var items = raw.Select(o => new
        {
            o.Id,
            orderNumber   = OrderHelper.FormatNumber(o.CreatedAt, o.Id),
            o.CustomerEmail,
            o.CustomerName,
            status        = o.status,
            o.TotalAmount,
            o.Currency,
            o.CreatedAt,
        });

        return Ok(new { items, total, page, pageSize });
    }

    // ── GET /api/admin/orders/{id} ────────────────────────────────────────────
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var order = await db.Orders
            .Include(o => o.Items)
                .ThenInclude(i => i.ProductVariant)
                    .ThenInclude(v => v.Product)
            .Include(o => o.Items)
                .ThenInclude(i => i.PortraitSession)
                    .ThenInclude(s => s.Template)
            .Include(o => o.Customer)
            .Include(o => o.DiscountCode)
            .Where(o => o.Id == id)
            .FirstOrDefaultAsync(ct);

        if (order is null)
            return NotFound();

        return Ok(new
        {
            order.Id,
            orderNumber          = OrderHelper.FormatNumber(order),
            order.CustomerEmail,
            order.CustomerName,
            status               = order.Status.ToString(),
            order.TotalAmount,
            order.Currency,
            order.StripePaymentIntentId,
            order.StripeSessionId,
            order.ShippingAddressJson,
            order.AdminNotes,
            order.AccessToken,
            order.CreatedAt,
            order.UpdatedAt,
            discountCode         = order.DiscountCode?.Code,
            items = order.Items.Select(i => new
            {
                i.Id,
                i.Quantity,
                i.UnitPrice,
                i.Currency,
                portraitSessionId  = i.PortraitSessionId,
                portraitPreviewKey = i.PortraitSession?.WatermarkedPreviewKey,
                templateName       = i.PortraitSession?.Template?.Name,
                productName        = i.ProductVariant.Product.Name,
                productType        = i.ProductVariant.Product.Type.ToString(),
                size               = i.ProductVariant.Size,
                productVariantId   = i.ProductVariant.Id
            })
        });
    }

    // ── POST /api/admin/orders/{id}/resend-email ──────────────────────────────
    [HttpPost("{id:guid}/resend-email")]
    public async Task<IActionResult> ResendEmail(Guid id, CancellationToken ct)
    {
        var order = await db.Orders
            .Include(o => o.Items)
                .ThenInclude(i => i.ProductVariant)
                    .ThenInclude(v => v.Product)
            .Include(o => o.Items)
                .ThenInclude(i => i.PortraitSession)
            .Where(o => o.Id == id)
            .FirstOrDefaultAsync(ct);

        if (order is null) return NotFound();

        try
        {
            await orderEmail.SendOrderConfirmationAsync(order, ct);
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
