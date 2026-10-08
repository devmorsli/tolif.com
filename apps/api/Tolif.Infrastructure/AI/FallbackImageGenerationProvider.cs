using Microsoft.Extensions.Logging;
using Tolif.Application.Interfaces;
using Tolif.Domain.Enums;

namespace Tolif.Infrastructure.AI;

/// <summary>
/// Chains multiple AI providers in priority order.
/// Order is read from the "ai.fallbackOrder" setting (comma-separated AiProvider names,
/// e.g. "Gemini,FalAi,OpenAi"). Falls back through each provider on failure.
/// </summary>
public class FallbackImageGenerationProvider(
    GeminiImageGenerationProvider gemini,
    FalAiImageGenerationProvider  falAi,
    OpenAiImageGenerationProvider openAi,
    ISettingsService              settingsService,
    ILogger<FallbackImageGenerationProvider> logger) : IImageGenerationProvider
{
    // This is the "outer" provider registered in DI — its ProviderType is just a sentinel.
    public AiProvider ProviderType => AiProvider.Gemini;

    public async Task<GenerationResult> GenerateAsync(GenerationRequest request, CancellationToken ct = default)
    {
        var providers = await BuildProviderChainAsync(ct);

        GenerationResult? lastResult = null;
        foreach (var provider in providers)
        {
            logger.LogInformation("AI generation attempt with provider {Provider}", provider.ProviderType);
            lastResult = await provider.GenerateAsync(request, ct);
            if (lastResult.Success) return lastResult;

            logger.LogWarning("Provider {Provider} failed: {Error}. Trying next.",
                provider.ProviderType, lastResult.ErrorMessage);
        }

        return lastResult ?? new GenerationResult(
            Success:      false,
            ImageData:    null,
            Status:       AiGenerationStatus.ProviderError,
            CostUsd:      null,
            DurationMs:   0,
            ErrorMessage: "No AI providers are configured.");
    }

    private async Task<IReadOnlyList<IImageGenerationProvider>> BuildProviderChainAsync(CancellationToken ct)
    {
        var orderSetting = await settingsService.GetAsync("ai.fallbackOrder", ct);
        var names = string.IsNullOrWhiteSpace(orderSetting)
            ? ["Gemini", "FalAi", "OpenAi"]
            : orderSetting.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        var result = new List<IImageGenerationProvider>();
        foreach (var name in names)
        {
            if (Enum.TryParse<AiProvider>(name, ignoreCase: true, out var p))
            {
                result.Add(p switch
                {
                    AiProvider.Gemini => gemini,
                    AiProvider.FalAi  => falAi,
                    AiProvider.OpenAi => openAi,
                    _                 => gemini
                });
            }
        }
        return result.Count > 0 ? result : [gemini];
    }
}
