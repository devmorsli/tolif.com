using Tolif.Domain.Common;

namespace Tolif.Domain.Entities;

public class DiscountCode : BaseEntity
{
    public string Code { get; set; } = default!;
    public string? StripeCouponId { get; set; }

    /// <summary>"percent" or "fixed"</summary>
    public string Type { get; set; } = "percent";
    public decimal Value { get; set; }

    public int? MaxUses { get; set; }
    public int Uses { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Order> Orders { get; set; } = [];
}
