using Tolif.Domain.Common;

namespace Tolif.Domain.Entities;

public class DigitalFile : BaseEntity
{
    public Guid DigitalProductTierId { get; set; }
    public DigitalProductTier? DigitalProductTier { get; set; }

    /// <summary>Human-readable display name shown to the buyer.</summary>
    public string FileName { get; set; } = default!;
    /// <summary>Storage key used to generate presigned download URLs.</summary>
    public string StorageKey { get; set; } = default!;
    public long FileSizeBytes { get; set; }
    public string ContentType { get; set; } = "application/octet-stream";
    public int SortOrder { get; set; } = 0;
}
