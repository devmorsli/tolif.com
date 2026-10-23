using System.Text;
using System.Text.Json;
using Tolif.Application.Interfaces;
using Tolif.Domain.Enums;

namespace Tolif.Infrastructure.AI;

/// <summary>
/// Generates portrait images using Google Gemini's multimodal image editing capability.
/// Strategy: send the template image (art style reference) + customer photos, instruct
/// Gemini to maintain the exact art style / composition but replace the subjects.
/// </summary>
public class GeminiImageGenerationProvider(
    ISettingsService settingsService,
    IStorageService storageService,
    IHttpClientFactory httpClientFactory) : IImageGenerationProvider
{
    public AiProvider ProviderType => AiProvider.Gemini;

    public async Task<GenerationResult> GenerateAsync(GenerationRequest request, CancellationToken ct = default)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();

        try
        {
            var apiKey = await settingsService.GetAsync("ai.gemini.apiKey", ct);
            if (string.IsNullOrWhiteSpace(apiKey))
                return Fail("Gemini API key is not configured.", sw);

            var model = await settingsService.GetAsync("ai.gemini.model", ct);
            if (string.IsNullOrWhiteSpace(model)) model = "gemini-2.0-flash-exp";

            // ── Download template + all customer photos in parallel ──────────
            var templateTask    = storageService.DownloadAsync(request.TemplateImageKey, ct);
            var customerTasks   = request.UploadedImageKeys
                                      .Select(k => storageService.DownloadAsync(k, ct))
                                      .ToList();
            await Task.WhenAll([templateTask, .. customerTasks]);

            var templateBase64  = Convert.ToBase64String(await templateTask);

            var customerParts   = new List<object>();
            foreach (var task in customerTasks)
            {
                customerParts.Add(new
                {
                    inline_data = new
                    {
                        mime_type = "image/jpeg",
                        data = Convert.ToBase64String(await task)
                    }
                });
            }

            // ── Build the prompt ─────────────────────────────────────────────
            int personCount, petCount;
            if (request.SubjectSlots is { Count: > 0 })
            {
                personCount = request.SubjectSlots.Count(s => s.SlotType == "person");
                petCount    = request.SubjectSlots.Count(s => s.SlotType == "pet");
            }
            else
            {
                personCount = request.UploadedImageKeys.Count;
                petCount    = 0;
            }

            int uploadedCount = personCount + petCount;

            // targetCount = exactly what the customer provided.
            // The template may have been designed for a different number — we ALWAYS
            // follow the customer's actual upload count, not the template's slot count.
            int targetCount = uploadedCount;

            var subjectParts = new List<string>();
            if (personCount > 0) subjectParts.Add($"{personCount} {(personCount == 1 ? "person" : "people")}");
            if (petCount    > 0) subjectParts.Add($"{petCount} {(petCount == 1 ? "pet" : "pets")}");
            var uploadedSummary = subjectParts.Count > 0
                ? string.Join(" and ", subjectParts)
                : $"{uploadedCount} subject(s)";

            // Admin-editable extra rules (empty by default — set in Settings → AI Providers)
            var extraRules = await settingsService.GetAsync("ai.generation.extra_rules", ct) ?? "";
            var extraRulesSection = string.IsNullOrWhiteSpace(extraRules)
                ? ""
                : $"\n══ ADDITIONAL INSTRUCTIONS FROM STUDIO ══\n{extraRules.Trim()}\n";

            var instruction = $"""
                You are a professional AI portrait artist creating museum-quality painterly portraits.

                ── IMAGE ROLES ──────────────────────────────────────────────────────────
                IMAGE 1 — STYLE REFERENCE (the template):
                  Use ONLY for: art style, painting medium, colour palette, lighting mood,
                  and overall composition. The subjects shown are anonymous PLACEHOLDERS —
                  discard every face and identity from this image entirely.
                  Never carry over, blend, or reference any person or pet from this image.

                IMAGES 2+ — CUSTOMER PHOTOS (the real subjects):
                  The customer provided {uploadedCount} photo(s) containing: {uploadedSummary}.
                  These are the ONLY faces and likenesses allowed in the final portrait.

                ── MANDATORY RULES ──────────────────────────────────────────────────────
                1. EXACT SUBJECT COUNT
                   Paint exactly {targetCount} subject(s) — no more, no fewer.
                   The template may show a different count; IGNORE IT completely.
                   • Template shows MORE subjects → remove the extras entirely.
                   • Template shows FEWER subjects → add the extra ones naturally.

                2. GROUP PHOTOS
                   If a single customer photo contains multiple people or pets, treat
                   EACH visible individual as a separate, distinct subject and count
                   them individually toward the {targetCount} total.

                3. FACE & IDENTITY FIDELITY
                   Reproduce every face EXACTLY as it appears in the customer photo:
                   same bone structure, eye shape, eye colour, nose, mouth, hair colour,
                   hair style, and any distinguishing features (glasses, beard, etc.).
                   Do NOT idealise, average, or blend with any other face.

                4. SKIN-TONE CONSISTENCY
                   The skin colour of every face MUST match the neck, ears, hands, and
                   any other exposed skin on the same person — seamlessly, no line or
                   colour shift between head and body.

                5. COLOUR RESTORATION FOR OLD PHOTOS
                   If a customer photo appears aged, faded, yellowed, desaturated, or
                   low-contrast, FIRST restore it to natural, vibrant, true-to-life
                   colours BEFORE applying the art style. Never carry the faded palette
                   into the final portrait.

                6. ART STYLE FIDELITY
                   Replicate the painting style, brushwork, colour palette, and lighting
                   of the reference image exactly. The output must look like it was
                   hand-crafted in that specific medium by a skilled artist.

                7. COMPOSITION & LAYOUT
                   Rearrange the composition so all {targetCount} subject(s) fill the
                   scene naturally. No empty chairs, no ghost silhouettes, no blank
                   spaces where a removed subject used to be.

                8. FINAL QUALITY
                   Deliver a seamless, high-resolution result. No artifacts, no visible
                   seams, no half-rendered or blurry subjects. Every subject must be
                   fully painted and sharply defined.
                {extraRulesSection}
                ── TEMPLATE CONTEXT ─────────────────────────────────────────────────────
                {request.Prompt}

                Generate the portrait now.
                """;

            // ── Assemble the Gemini request ──────────────────────────────────
            var parts = new List<object>
            {
                new { text = instruction },
                // Template image (art-style reference)
                new
                {
                    inline_data = new
                    {
                        mime_type = "image/jpeg",
                        data = templateBase64
                    }
                }
            };
            // Add customer photos after
            parts.AddRange(customerParts);

            var body = new
            {
                contents = new[]
                {
                    new { role = "user", parts = parts.ToArray() }
                },
                generationConfig = new
                {
                    responseModalities = new[] { "image", "text" },
                    temperature = 1.0
                }
            };

            var http = httpClientFactory.CreateClient("ai");
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

            var response = await http.PostAsync(url,
                new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"), ct);

            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync(ct);
                return Fail($"Gemini error {(int)response.StatusCode}: {err}", sw);
            }

            var raw = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(raw);

            // Find the inline_data part (generated image)
            var candidates = doc.RootElement.GetProperty("candidates");
            foreach (var candidate in candidates.EnumerateArray())
            {
                var contentParts = candidate.GetProperty("content").GetProperty("parts");
                foreach (var part in contentParts.EnumerateArray())
                {
                    JsonElement inlineData;
                    if (!part.TryGetProperty("inline_data", out inlineData) &&
                        !part.TryGetProperty("inlineData", out inlineData))
                        continue;

                    {
                        var imageData = Convert.FromBase64String(
                            inlineData.GetProperty("data").GetString()!);

                        sw.Stop();
                        return new GenerationResult(
                            Success: true,
                            ImageData: imageData,
                            Status: AiGenerationStatus.Success,
                            CostUsd: null,
                            DurationMs: (int)sw.ElapsedMilliseconds);
                    }
                }
            }

            return Fail("Gemini did not return an image in the response.", sw);
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
            Success: false,
            ImageData: null,
            Status: AiGenerationStatus.ProviderError,
            CostUsd: null,
            DurationMs: (int)sw.ElapsedMilliseconds,
            ErrorMessage: message);
    }
}
