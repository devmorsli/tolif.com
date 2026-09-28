using Tolif.Domain.Common;
using Tolif.Domain.Enums;

namespace Tolif.Domain.Entities;

public class PrintOrder : BaseEntity
{
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = default!;

    public PrintProvider Provider { get; set; }
    public string? ProviderOrderId { get; set; }
    public string Status { get; set; } = "pending";
    public string? TrackingUrl { get; set; }
    public string? TrackingNumber { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public int RetryCount { get; set; }
    public string? LastErrorMessage { get; set; }
}
