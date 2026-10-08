using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Tolif.Application.Interfaces;
using Tolif.Domain.Enums;

namespace Tolif.Infrastructure.AI;

/// <summary>
/// fal.ai image generation provider using the fal-ai/flux-pro model.
/// Docs: https://fal.ai/models/fal-ai/flux-pro
/// Auth: Key-Auth header (Key {key}).
/// </summary>
public class FalAiImageGenerationProvider(
    ISettingsService settingsService,
    IStorageService storageService,
    IHttpClientFactory httpClientFactory) : IImageGenerationProvider
{
    public AiProvider ProviderType => AiProvider.FalAi;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy        = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
    };

    public async Task<GenerationResult> GenerateAsync(GenerationRequest request, CancellationToken ct = default)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            var apiKey = await settingsService.GetAsync("ai.falai.apiKey", ct);
            if (string.IsNullOrWhiteSpace(apiKey))
                return Fail("fal.ai API key is not configured.", sw);

            var model = await settingsService.GetAsync("ai.falai.model", ct);
            if (string.IsNullOrWhiteSpace(model)) model = "fal-ai/flux-pro";

            // Download template image to embed as reference
            var templateBytes  = await storageService.DownloadAsync(request.TemplateImageKey, ct);
            var templateBase64 = $"data:image/jpeg;base64,{Convert.ToBase64String(templateBytes)}";

            // Build combined prompt
            var prompt = $"""
                Portrait in the exact style of the reference image.
                Maintain the art style, colour palette, composition, and mood precisely.
                Replace the subjects with those from the customer photos, preserving their likeness.
                {request.Prompt}
                """;

            var body = new
            {
                prompt,
                image_url         = templateBase64,
                num_images        = 1,
                enable_safety_checker = true,
                output_format     = "jpeg",
                aspect_ratio      = "1:1",
            };

            var http = httpClientFactory.CreateClient();
            http.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Key", apiKey);

            var url = $"https://fal.run/{model}";
            var response = await http.PostAsync(url,
                new StringContent(JsonSerializer.Serialize(body, JsonOpts), Encoding.UTF8, "application/json"), ct);

            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync(ct);
                return Fail($"fal.ai error {(int)response.StatusCode}: {err}", sw);
            }

            var raw = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(raw);

            // Response shape: { "images": [ { "url": "...", "content_type": "image/jpeg" } ] }
            if (!doc.RootElement.TryGetProperty("images", out var images) ||
                images.GetArrayLength() == 0)
                return Fail("fal.ai returned no images.", sw);

            var imageUrl = images[0].GetProperty("url").GetString()!;

            // Download the generated image
            var imageBytes = await http.GetByteArrayAsync(imageUrl, ct);

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
