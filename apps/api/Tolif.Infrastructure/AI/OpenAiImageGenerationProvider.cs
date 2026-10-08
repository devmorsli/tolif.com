using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Tolif.Application.Interfaces;
using Tolif.Domain.Enums;

namespace Tolif.Infrastructure.AI;

/// <summary>
/// OpenAI image generation provider using gpt-image-1 (or dall-e-3 fallback).
/// Docs: https://platform.openai.com/docs/api-reference/images/create
/// Auth: Bearer token.
/// </summary>
public class OpenAiImageGenerationProvider(
    ISettingsService settingsService,
    IHttpClientFactory httpClientFactory) : IImageGenerationProvider
{
    public AiProvider ProviderType => AiProvider.OpenAi;

    public async Task<GenerationResult> GenerateAsync(GenerationRequest request, CancellationToken ct = default)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            var apiKey = await settingsService.GetAsync("ai.openai.apiKey", ct);
            if (string.IsNullOrWhiteSpace(apiKey))
                return Fail("OpenAI API key is not configured.", sw);

            var model = await settingsService.GetAsync("ai.openai.model", ct);
            if (string.IsNullOrWhiteSpace(model)) model = "dall-e-3";

            var prompt = $"""
                Create a high-quality portrait in a specific artistic style.
                {request.Prompt}
                The portrait should be beautifully crafted, with rich colours and fine details.
                Make it look like a premium commissioned portrait artwork.
                """;

            var http = httpClientFactory.CreateClient();
            http.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", apiKey);

            var body = new
            {
                model,
                prompt,
                n              = 1,
                size           = "1024x1024",
                quality        = "hd",
                response_format = "b64_json",
            };

            var response = await http.PostAsync(
                "https://api.openai.com/v1/images/generations",
                new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"), ct);

            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync(ct);
                return Fail($"OpenAI error {(int)response.StatusCode}: {err}", sw);
            }

            var raw = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(raw);

            // Response shape: { "data": [ { "b64_json": "..." } ] }
            if (!doc.RootElement.TryGetProperty("data", out var data) ||
                data.GetArrayLength() == 0)
                return Fail("OpenAI returned no images.", sw);

            var b64 = data[0].GetProperty("b64_json").GetString()!;
            var imageBytes = Convert.FromBase64String(b64);

            sw.Stop();
            return new GenerationResult(
                Success:    true,
                ImageData:  imageBytes,
                Status:     AiGenerationStatus.Success,
                CostUsd:    null,
                DurationMs: (int)sw.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            return Fail(ex.Message, sw);
        }
    }

    private static GenerationResult Fail(string message, System.Diagnostics.Stopwatch sw)
    {
        sw.Stop();
        return new GenerationResult(
            Success:      false,
            ImageData:    null,
            Status:       AiGenerationStatus.ProviderError,
            CostUsd:      null,
            DurationMs:   (int)sw.ElapsedMilliseconds,
            ErrorMessage: message);
    }
}
