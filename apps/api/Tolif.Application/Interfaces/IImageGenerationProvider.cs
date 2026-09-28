using Tolif.Domain.Enums;

namespace Tolif.Application.Interfaces;

public record GenerationRequest(
    Guid SessionId,
    string TemplateImageKey,
    string Prompt,
    IReadOnlyList<string> UploadedImageKeys,
    bool IsHighRes = false
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
