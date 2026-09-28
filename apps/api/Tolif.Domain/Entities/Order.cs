using Tolif.Domain.Common;
using Tolif.Domain.Enums;

namespace Tolif.Domain.Entities;

public class Order : BaseEntity
{
    public Guid? CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public string CustomerEmail { get; set; } = default!;
    public string? CustomerName { get; set; }

    public OrderStatus Status { get; set; } = OrderStatus.Pending;

    public string? StripePaymentIntentId { get; set; }
    public string? StripeSessionId { get; set; }

    public decimal TotalAmount { get; set; }
    public string Currency { get; set; } = "EUR";

    public Guid? DiscountCodeId { get; set; }
    public DiscountCode? DiscountCode { get; set; }

    /// <summary>JSON: {line1, line2?, city, state?, postalCode, country}</summary>
    public string? ShippingAddressJson { get; set; }

    public string? AdminNotes { get; set; }

    /// <summary>Secure token for the customer order-status page (no login required)</summary>
    public string AccessToken { get; set; } = Guid.NewGuid().ToString("N");

    public ICollection<OrderItem> Items { get; set; } = [];
    public ICollection<PrintOrder> PrintOrders { get; set; } = [];
}
