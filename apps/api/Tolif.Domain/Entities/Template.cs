using Tolif.Domain.Common;
using Tolif.Domain.Enums;

namespace Tolif.Domain.Entities;

public class Template : BaseEntity
{
    public string Slug { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string Category { get; set; } = default!;
    public string TemplateImageKey { get; set; } = default!;  // S3 key
    public string Prompt { get; set; } = default!;
    /// <summary>JSON array of upload slot definitions: [{name, label, type (person|pet), required}]</summary>
    public string UploadSlotsJson { get; set; } = "[]";
    public AiProvider? AiProviderOverride { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public string? OgImageKey { get; set; }
    public string? Description { get; set; }

    public ICollection<PortraitSession> PortraitSessions { get; set; } = [];
}
