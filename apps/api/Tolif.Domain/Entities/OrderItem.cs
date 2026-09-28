using Tolif.Domain.Common;

namespace Tolif.Domain.Entities;

public class OrderItem : BaseEntity
{
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = default!;

    public Guid ProductVariantId { get; set; }
    public ProductVariant ProductVariant { get; set; } = default!;

    public Guid PortraitSessionId { get; set; }
    public PortraitSession PortraitSession { get; set; } = default!;

    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public string Currency { get; set; } = "EUR";
}
