using Tolif.Domain.Common;

namespace Tolif.Domain.Entities;

public class ProductVariant : BaseEntity
{
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = default!;

    public string Size { get; set; } = default!;       // e.g. "30x40cm", "A4", "Digital"
    public decimal Price { get; set; }
    public string Currency { get; set; } = "EUR";

    public string? PrintfulVariantId { get; set; }
    public string? PrintifyVariantId { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<OrderItem> OrderItems { get; set; } = [];
}
