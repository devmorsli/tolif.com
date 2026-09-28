using Tolif.Domain.Common;
using Tolif.Domain.Enums;

namespace Tolif.Domain.Entities;

public class AiGenerationLog : BaseEntity
{
    public Guid PortraitSessionId { get; set; }
    public PortraitSession PortraitSession { get; set; } = default!;

    public AiProvider Provider { get; set; }
    public string Model { get; set; } = default!;
    public AiGenerationStatus Status { get; set; }

    public decimal? CostUsd { get; set; }
    public int? DurationMs { get; set; }

    public bool IsHighRes { get; set; }

    /// <summary>Truncated error message if Status != Success.</summary>
    public string? ErrorMessage { get; set; }
}
