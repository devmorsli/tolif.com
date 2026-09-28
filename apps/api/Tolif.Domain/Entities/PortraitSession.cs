using Tolif.Domain.Common;
using Tolif.Domain.Enums;

namespace Tolif.Domain.Entities;

public class PortraitSession : BaseEntity
{
    public Guid TemplateId { get; set; }
    public Template Template { get; set; } = default!;

    public PortraitSessionStatus Status { get; set; } = PortraitSessionStatus.Created;

    /// <summary>Number of times the customer has requested a regeneration.</summary>
    public int RegenerationCount { get; set; }

    /// <summary>JSON: {"person": "s3key/...", "pet": "s3key/..."}</summary>
    public string UploadedFilesJson { get; set; } = "{}";

    /// <summary>S3 key for the watermarked low-res preview.</summary>
    public string? WatermarkedPreviewKey { get; set; }

    /// <summary>S3 key for the clean high-res final image (only after payment).</summary>
    public string? FinalImageKey { get; set; }

    /// <summary>IP address of the session initiator (for rate limiting).</summary>
    public string? IpAddress { get; set; }

    public DateTime? PhotosDeletedAt { get; set; }
    public DateTime? AbandonedAt { get; set; }

    public ICollection<AiGenerationLog> GenerationLogs { get; set; } = [];
}
