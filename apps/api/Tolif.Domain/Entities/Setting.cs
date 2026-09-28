using Tolif.Domain.Common;

namespace Tolif.Domain.Entities;

/// <summary>
/// Key/value store for all admin-configurable settings.
/// Values for sensitive keys are encrypted at rest via ASP.NET Core Data Protection.
/// </summary>
public class Setting : BaseEntity
{
    public string Key { get; set; } = default!;
    /// <summary>Encrypted if IsSensitive == true.</summary>
    public string Value { get; set; } = default!;
    public bool IsSensitive { get; set; }
    public string? Description { get; set; }
}
