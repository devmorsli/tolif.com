using Tolif.Domain.Common;
using Tolif.Domain.Enums;

namespace Tolif.Domain.Entities;

public class Product : BaseEntity
{
    public string Name { get; set; } = default!;
    public ProductType Type { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }

    public ICollection<ProductVariant> Variants { get; set; } = [];
}
