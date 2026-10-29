using Tolif.Domain.Common;

namespace Tolif.Domain.Entities;

public class DigitalProductTier : BaseEntity
{
    public Guid DigitalProductId { get; set; }
    public DigitalProduct? DigitalProduct { get; set; }

    /// <summary>Internal key: "basic" | "pro" | "bundle"</summary>
    public string TierName { get; set; } = default!;
    /// <summary>Display name shown to users, e.g. "Starter", "Pro", "Bundle"</summary>
    public string DisplayName { get; set; } = default!;

    public decimal Price { get; set; }
    public string Currency { get; set; } = "EUR";

    /// <summary>JSON array of feature bullet strings.</summary>
    public string FeaturesJson { get; set; } = "[]";

    public string? StripePriceId { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; } = 0;

    public ICollection<DigitalFile> Files { get; set; } = [];
}
