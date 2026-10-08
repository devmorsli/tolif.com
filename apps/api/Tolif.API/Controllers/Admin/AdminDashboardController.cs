using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tolif.Application.Interfaces;
using Tolif.Domain.Enums;

namespace Tolif.API.Controllers.Admin;

[ApiController]
[Route("api/admin/dashboard")]
[Authorize(Roles = "Admin")]
public class AdminDashboardController(IApplicationDbContext db) : ControllerBase
{
    // ── GET /api/admin/dashboard ──────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var totalOrders = await db.Orders.CountAsync(ct);

        var totalRevenue = await db.Orders
            .Where(o => o.Status == OrderStatus.Paid
                     || o.Status == OrderStatus.GeneratingHighRes
                     || o.Status == OrderStatus.Ready
                     || o.Status == OrderStatus.SubmittedToPrinter
                     || o.Status == OrderStatus.Shipped)
            .SumAsync(o => (decimal?)o.TotalAmount, ct) ?? 0m;

        var pendingOrders = await db.Orders
            .CountAsync(o => o.Status == OrderStatus.Pending, ct);

        var totalSessions = await db.PortraitSessions.CountAsync(ct);

        var recentOrders = await db.Orders
            .OrderByDescending(o => o.CreatedAt)
            .Take(5)
            .Select(o => new
            {
                o.Id,
                o.CustomerEmail,
                status = o.Status.ToString(),
                o.TotalAmount,
                o.Currency,
                o.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(new
        {
            totalOrders,
            totalRevenue,
            pendingOrders,
            totalSessions,
            recentOrders
        });
    }
}
