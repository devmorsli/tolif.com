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
    public string? Style { get; set; }          // e.g. "Oil Painting", "Watercolour"
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public string? OgImageKey { get; set; }
    public string? Description { get; set; }

    /// <summary>How many extra person photos the customer may add beyond the base slots (0 = no extras allowed).</summary>
    public int ExtraPersonsAllowed { get; set; } = 0;
    /// <summary>How many extra pet photos the customer may add beyond the base slots (0 = no extras allowed).</summary>
    public int ExtraPetsAllowed { get; set; } = 0;

    public ICollection<PortraitSession> PortraitSessions { get; set; } = [];
}
