using Tolif.Domain.Common;

namespace Tolif.Domain.Entities;

public class AnalyticsEvent : BaseEntity
{
    public string EventType { get; set; } = default!;
    public string? SessionId { get; set; }
    public string? IpAddress { get; set; }
    /// <summary>JSON payload with event-specific data.</summary>
    public string DataJson { get; set; } = "{}";
}
