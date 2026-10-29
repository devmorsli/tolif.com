using Tolif.Domain.Common;

namespace Tolif.Domain.Entities;

public class DigitalProduct : BaseEntity
{
    public string Name { get; set; } = default!;
    public string Slug { get; set; } = default!;
    public string Tagline { get; set; } = "";
    public string Description { get; set; } = "";
    public string? HeroImageKey { get; set; }
    /// <summary>JSON array of feature strings shown in the hero section.</summary>
    public string FeaturesJson { get; set; } = "[]";
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; } = 0;

    public ICollection<DigitalProductTier> Tiers { get; set; } = [];
}
