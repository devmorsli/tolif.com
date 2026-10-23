using Hangfire;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tolif.Application.Helpers;
using Tolif.Application.Interfaces;
using Tolif.Domain.Enums;
using Tolif.Infrastructure.Jobs;

namespace Tolif.API.Controllers.Admin;

[ApiController]
[Route("api/admin/orders")]
[Authorize(Roles = "Admin")]
public class AdminOrdersController(
    IApplicationDbContext db,
    IOrderEmailService    orderEmail,
    IBackgroundJobClient  hangfire) : ControllerBase
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
        [FromQuery] int       page           = 1,
        [FromQuery] int       pageSize       = 20,
        [FromQuery] string?   status         = null,
        [FromQuery] string?   printStatus    = null,
        [FromQuery] string?   search         = null,
        [FromQuery] DateTime? from           = null,
        [FromQuery] DateTime? to             = null,
        [FromQuery] bool      includePending = false,
        CancellationToken ct = default)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Orders.AsQueryable();

        // By default exclude Pending orders — they live in the Leads page
        if (!includePending && string.IsNullOrWhiteSpace(status))
            query = query.Where(o => o.Status != OrderStatus.Pending);

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<OrderStatus>(status, ignoreCase: true, out var parsedStatus))
            query = query.Where(o => o.Status == parsedStatus);

        if (!string.IsNullOrWhiteSpace(printStatus))
            query = query.Where(o =>
                db.PrintOrders
                    .Where(p => p.OrderId == o.Id)
                    .OrderByDescending(p => p.CreatedAt)
                    .Select(p => p.Status)
                    .FirstOrDefault() == printStatus);

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
                printStatus   = db.PrintOrders
                    .Where(p => p.OrderId == o.Id)
                    .OrderByDescending(p => p.CreatedAt)
                    .Select(p => p.Status)
                    .FirstOrDefault(),
                printLastError = db.PrintOrders
                    .Where(p => p.OrderId == o.Id)
                    .OrderByDescending(p => p.CreatedAt)
                    .Select(p => p.LastErrorMessage)
                    .FirstOrDefault(),
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
            o.printStatus,
            o.printLastError,
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

        var latestPrint = await db.PrintOrders
            .Where(p => p.OrderId == id)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new { p.Status, p.LastErrorMessage, p.RetryCount })
            .FirstOrDefaultAsync(ct);

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
            printStatus          = latestPrint?.Status,
            printLastError       = latestPrint?.LastErrorMessage,
            printRetryCount      = latestPrint?.RetryCount ?? 0,
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

    // ── POST /api/admin/orders/{id}/submit-to-printful ───────────────────────
    /// <summary>Manually submit a single paid order to Printful (ignores autoSubmit setting).</summary>
    [HttpPost("{id:guid}/submit-to-printful")]
    public async Task<IActionResult> SubmitToPrintful(Guid id, CancellationToken ct)
    {
        var order = await db.Orders
            .Include(o => o.Items)
                .ThenInclude(i => i.ProductVariant)
                    .ThenInclude(v => v!.Product)
            .Include(o => o.Items)
                .ThenInclude(i => i.PortraitSession)
            .FirstOrDefaultAsync(o => o.Id == id, ct);

        if (order is null) return NotFound();

        // ── Pre-flight validation ─────────────────────────────────────────
        var physicalItems = order.Items
            .Where(i => i.ProductVariant?.Product?.Type != Domain.Enums.ProductType.Digital)
            .ToList();

        if (physicalItems.Count == 0)
            return BadRequest(new { error = "This order has no physical items to print." });

        var noVariantId = physicalItems.FirstOrDefault(i =>
            string.IsNullOrEmpty(i.ProductVariant?.PrintfulVariantId));
        if (noVariantId is not null)
            return BadRequest(new
            {
                error = $"Variant '{noVariantId.ProductVariant?.Size}' has no Printful Variant ID. " +
                        "Go to Admin → Products and set it."
            });

        var noFinalImage = physicalItems.FirstOrDefault(i =>
            string.IsNullOrEmpty(i.PortraitSession?.FinalImageKey));
        if (noFinalImage is not null)
            return BadRequest(new { error = "High-resolution portrait is not ready yet. Please wait a moment and try again." });

        hangfire.Enqueue<SubmitPrintOrderJob>(j => j.ForceExecuteAsync(id, CancellationToken.None));
        return Ok(new { queued = true });
    }

    // ── POST /api/admin/orders/submit-bulk ────────────────────────────────────
    /// <summary>Manually submit multiple paid orders to Printful in bulk.</summary>
    [HttpPost("submit-bulk")]
    public async Task<IActionResult> SubmitBulk([FromBody] BulkSubmitRequest req, CancellationToken ct)
    {
        if (req.Ids is not { Count: > 0 })
            return BadRequest(new { message = "No order IDs provided." });

        var validIds = await db.Orders
            .Where(o => req.Ids.Contains(o.Id))
            .Select(o => o.Id)
            .ToListAsync(ct);

        foreach (var id in validIds)
            hangfire.Enqueue<SubmitPrintOrderJob>(j => j.ForceExecuteAsync(id, CancellationToken.None));

        return Ok(new { queued = validIds.Count });
    }

    // ── POST /api/admin/orders/submit-unprinted ───────────────────────────────
    /// <summary>
    /// Submits all paid orders that have no PrintOrder record yet (never sent to printer).
    /// Optional date range to restrict to a specific period.
    /// </summary>
    [HttpPost("submit-unprinted")]
    public async Task<IActionResult> SubmitUnprinted(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct)
    {
        var query = db.Orders
            .Where(o => PaidStatuses.Contains(o.Status));

        if (from.HasValue)
            query = query.Where(o => o.CreatedAt >= DateTime.SpecifyKind(from.Value, DateTimeKind.Utc));
        if (to.HasValue)
            query = query.Where(o => o.CreatedAt < DateTime.SpecifyKind(to.Value, DateTimeKind.Utc).AddDays(1));

        // Only orders that have never been submitted (no PrintOrder row)
        var ids = await query
            .Where(o => !db.PrintOrders.Any(p => p.OrderId == o.Id))
            .Select(o => o.Id)
            .ToListAsync(ct);

        foreach (var id in ids)
            hangfire.Enqueue<SubmitPrintOrderJob>(j => j.ForceExecuteAsync(id, CancellationToken.None));

        return Ok(new { queued = ids.Count });
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

    // ── DELETE /api/admin/orders/{id} ─────────────────────────────────────────
    /// <summary>
    /// Deletes a Pending (abandoned) order. Refuses to delete paid/fulfilled orders.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteOrder(Guid id, CancellationToken ct)
    {
        var order = await db.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order is null) return NotFound();

        if (order.Status != OrderStatus.Pending)
            return BadRequest(new { error = "Only pending (unpaid) orders can be deleted." });

        db.Orders.Remove(order);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

public record BulkSubmitRequest(List<Guid> Ids);
