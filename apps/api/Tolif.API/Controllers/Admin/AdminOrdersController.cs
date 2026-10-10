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
    private static readonly OrderStatus[] PaidStatuses =
    [
        OrderStatus.Paid, OrderStatus.GeneratingHighRes,
        OrderStatus.Ready, OrderStatus.SubmittedToPrinter,
        OrderStatus.Shipped,
    ];

    // ── GET /api/admin/orders ─────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int       page     = 1,
        [FromQuery] int       pageSize = 20,
        [FromQuery] string?   status   = null,
        [FromQuery] string?   search   = null,
        [FromQuery] DateTime? from     = null,
        [FromQuery] DateTime? to       = null,
        CancellationToken ct = default)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Orders.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<OrderStatus>(status, ignoreCase: true, out var parsedStatus))
            query = query.Where(o => o.Status == parsedStatus);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(o =>
                o.CustomerEmail.Contains(search) ||
                (o.CustomerName != null && o.CustomerName.Contains(search)) ||
                (o.StripePaymentIntentId != null && o.StripePaymentIntentId.Contains(search)));

        if (from.HasValue)
            query = query.Where(o => o.CreatedAt >= DateTime.SpecifyKind(from.Value, DateTimeKind.Utc));

        if (to.HasValue)
            query = query.Where(o => o.CreatedAt < DateTime.SpecifyKind(to.Value, DateTimeKind.Utc).AddDays(1));

        var total   = await query.CountAsync(ct);
        var revenue = await query
            .Where(o => PaidStatuses.Contains(o.Status))
            .SumAsync(o => (decimal?)o.TotalAmount, ct) ?? 0m;

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

        return Ok(new { items, total, page, pageSize, revenue });
    }

    // ── GET /api/admin/orders/stats ───────────────────────────────────────────
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats(CancellationToken ct)
    {
        var now       = DateTime.UtcNow;
        var today     = now.Date;
        var daysFromMonday = ((int)today.DayOfWeek + 6) % 7;
        var weekStart  = DateTime.SpecifyKind(today.AddDays(-daysFromMonday), DateTimeKind.Utc);
        var monthStart = DateTime.SpecifyKind(new DateTime(now.Year, now.Month, 1), DateTimeKind.Utc);
        var todayUtc   = DateTime.SpecifyKind(today, DateTimeKind.Utc);
        var cutoff     = now.AddMinutes(-30);

        var todayOrders = await db.Orders.CountAsync(o => o.CreatedAt >= todayUtc, ct);

        var todayRevenue = await db.Orders
            .Where(o => o.CreatedAt >= todayUtc && PaidStatuses.Contains(o.Status))
            .SumAsync(o => (decimal?)o.TotalAmount, ct) ?? 0m;

        var weekRevenue = await db.Orders
            .Where(o => o.CreatedAt >= weekStart && PaidStatuses.Contains(o.Status))
            .SumAsync(o => (decimal?)o.TotalAmount, ct) ?? 0m;

        var monthRevenue = await db.Orders
            .Where(o => o.CreatedAt >= monthStart && PaidStatuses.Contains(o.Status))
            .SumAsync(o => (decimal?)o.TotalAmount, ct) ?? 0m;

        var abandonedCount = await db.Orders
            .CountAsync(o => o.Status == OrderStatus.Pending && o.CreatedAt < cutoff, ct);

        return Ok(new { todayOrders, todayRevenue, weekRevenue, monthRevenue, abandonedCount });
    }

    // ── GET /api/admin/orders/abandoned ──────────────────────────────────────
    [HttpGet("abandoned")]
    public async Task<IActionResult> GetAbandoned(
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var cutoff = DateTime.UtcNow.AddMinutes(-30);

        var query = db.Orders.Where(o =>
            o.Status == OrderStatus.Pending && o.CreatedAt < cutoff);

        var total = await query.CountAsync(ct);

        var orders = await query
            .Include(o => o.Items)
                .ThenInclude(i => i.PortraitSession)
            .Include(o => o.Items)
                .ThenInclude(i => i.ProductVariant)
                    .ThenInclude(v => v!.Product)
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var items = orders.Select(o => new
        {
            o.Id,
            orderNumber  = OrderHelper.FormatNumber(o),
            o.CustomerEmail,
            o.CustomerName,
            o.TotalAmount,
            o.Currency,
            o.CreatedAt,
            hasPreview   = o.Items.Any(i => i.PortraitSession?.WatermarkedPreviewKey != null),
            sessionId    = (Guid?)o.Items
                .Select(i => i.PortraitSession?.Id)
                .FirstOrDefault(id => id.HasValue),
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

    // ── POST /api/admin/orders/{id}/send-abandonment-email ───────────────────
    [HttpPost("{id:guid}/send-abandonment-email")]
    public async Task<IActionResult> SendAbandonmentEmail(Guid id, CancellationToken ct)
    {
        var order = await db.Orders
            .Include(o => o.Items)
                .ThenInclude(i => i.PortraitSession)
            .Include(o => o.Items)
                .ThenInclude(i => i.ProductVariant)
                    .ThenInclude(v => v!.Product)
            .Where(o => o.Id == id && o.Status == OrderStatus.Pending)
            .FirstOrDefaultAsync(ct);

        if (order is null) return NotFound(new { message = "Order not found or not pending." });

        try
        {
            await orderEmail.SendAbandonmentEmailAsync(order, ct);
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ── POST /api/admin/orders/abandonment-campaign ───────────────────────────
    [HttpPost("abandonment-campaign")]
    public async Task<IActionResult> SendAbandonmentCampaign(CancellationToken ct)
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-30);

        var orders = await db.Orders
            .Include(o => o.Items)
                .ThenInclude(i => i.PortraitSession)
            .Include(o => o.Items)
                .ThenInclude(i => i.ProductVariant)
                    .ThenInclude(v => v!.Product)
            .Where(o => o.Status == OrderStatus.Pending && o.CreatedAt < cutoff)
            .ToListAsync(ct);

        var sent   = 0;
        var failed = 0;

        foreach (var order in orders)
        {
            try   { await orderEmail.SendAbandonmentEmailAsync(order, ct); sent++;   }
            catch { failed++; }
        }

        return Ok(new { sent, failed, total = orders.Count });
    }
}
