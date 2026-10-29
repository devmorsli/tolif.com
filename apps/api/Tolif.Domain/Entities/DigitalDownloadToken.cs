using Tolif.Domain.Common;

namespace Tolif.Domain.Entities;

public class DigitalDownloadToken : BaseEntity
{
    public Guid DigitalOrderId { get; set; }
    public DigitalOrder? DigitalOrder { get; set; }

    public Guid DigitalFileId { get; set; }
    public DigitalFile? DigitalFile { get; set; }

    /// <summary>Unique opaque token sent to the buyer.</summary>
    public string Token { get; set; } = Guid.NewGuid().ToString("N");

    public DateTime ExpiresAt { get; set; }
    public int DownloadCount { get; set; } = 0;
    public int MaxDownloads { get; set; } = 10;
}
