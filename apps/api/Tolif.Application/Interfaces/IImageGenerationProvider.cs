using Tolif.Domain.Enums;

namespace Tolif.Application.Interfaces;

/// <summary>Describes one uploaded subject slot so the AI knows the exact breakdown.</summary>
public record SubjectSlot(string SlotName, string SlotType); // SlotType: "person" | "pet"

public record GenerationRequest(
    Guid SessionId,
    string TemplateImageKey,
    string Prompt,
    IReadOnlyList<string> UploadedImageKeys,
    bool IsHighRes = false,
    IReadOnlyList<SubjectSlot>? SubjectSlots = null,
    /// <summary>
    /// The number of subjects the template was designed for (from its uploadSlotsJson).
    /// May differ from UploadedImageKeys.Count when users upload fewer photos — the AI
    /// should then look for multiple people/pets within a single photo.
    /// </summary>
    int ExpectedSubjectCount = 0
);

public record GenerationResult(
    bool Success,
    byte[]? ImageData,
    AiGenerationStatus Status,
    decimal? CostUsd,
    int DurationMs,
    string? ErrorMessage = null
);

public interface IImageGenerationProvider
{
    AiProvider ProviderType { get; }
    Task<GenerationResult> GenerateAsync(GenerationRequest request, CancellationToken ct = default);
}
