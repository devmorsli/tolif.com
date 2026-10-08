using Tolif.Domain.Entities;

namespace Tolif.Application.Helpers;

/// <summary>
/// Shared order presentation helpers — accessible from Infrastructure (emails)
/// and API (controllers) without creating circular dependencies.
/// </summary>
public static class OrderHelper
{
    /// <summary>
    /// Human-readable order number: TOL-DDMMYY-XXXX
    /// Example: TOL-041026-A3F7  (placed on 4 Oct 2026, id prefix A3F7)
    /// </summary>
    public static string FormatNumber(Order order) =>
        FormatNumber(order.CreatedAt, order.Id);

    /// <summary>
    /// Same format from raw values — use this in LINQ projections that
    /// materialise before mapping (avoids EF Core translation issues).
    /// </summary>
    public static string FormatNumber(DateTime createdAt, Guid id) =>
        $"TOL-{createdAt:ddMMyy}-{id.ToString("N")[..4].ToUpper()}";
}
