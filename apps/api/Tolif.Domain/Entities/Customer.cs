using Tolif.Domain.Common;

namespace Tolif.Domain.Entities;

public class Customer : BaseEntity
{
    public string Email { get; set; } = default!;
    public string? Name { get; set; }
    public string? StripeCustomerId { get; set; }
    public DateTime? GdprDeletedAt { get; set; }

    public ICollection<Order> Orders { get; set; } = [];
}
