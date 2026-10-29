using Tolif.Domain.Common;

namespace Tolif.Domain.Entities;

public class DigitalOrder : BaseEntity
{
    public string CustomerEmail { get; set; } = default!;
    public string? CustomerName { get; set; }

    public Guid DigitalProductId { get; set; }
    public DigitalProduct? DigitalProduct { get; set; }

    public Guid DigitalProductTierId { get; set; }
    public DigitalProductTier? DigitalProductTier { get; set; }

    /// <summary>Snapshot of tier name at time of purchase.</summary>
    public string TierName { get; set; } = default!;
    /// <summary>Snapshot of tier display name at time of purchase.</summary>
    public string TierDisplayName { get; set; } = default!;

    public decimal AmountPaid { get; set; }
    public string Currency { get; set; } = "EUR";

    public string? StripeSessionId { get; set; }
    public string? StripePaymentIntentId { get; set; }

    /// <summary>"pending" | "paid" | "refunded"</summary>
    public string Status { get; set; } = "pending";

    public ICollection<DigitalDownloadToken> DownloadTokens { get; set; } = [];
}
