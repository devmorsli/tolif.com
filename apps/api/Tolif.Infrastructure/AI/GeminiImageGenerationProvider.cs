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

            // Build per-slot subject descriptions for the strict cast list
            var castLines = new List<string>();
            for (int i = 0; i < request.SubjectSlots.Count; i++)
            {
                var slot = request.SubjectSlots[i];
                castLines.Add($"  • Subject {i + 1}: from Customer Photo {i + 1} — a {slot.SlotType}");
            }
            var castList = castLines.Count > 0
                ? string.Join("\n", castLines)
                : $"  • {targetCount} subject(s) from the customer photos above";

            var instruction = $"""
                You are a professional AI portrait artist. Your ONLY job is to paint the
                EXACT subjects from the customer photos, in the exact art style of the
                style reference, with zero deviation from either.

                ══ ABSOLUTE PROHIBITIONS — violating any one = complete failure ══════════
                ✗ NEVER include any face, person, or pet from the style reference image
                ✗ NEVER add any person or pet that does not appear in a customer photo
                ✗ NEVER change anyone's gender — a man is always painted as a man,
                  a woman is always painted as a woman, regardless of what the template shows
                ✗ NEVER put feminine/women's clothing on a male subject
                ✗ NEVER put masculine/men's clothing on a female subject
                ✗ NEVER replace a missing or unclear subject with anyone from the template
                ✗ NEVER blend a customer face with a template face
                ✗ NEVER invent a new character not present in the customer photos
                ✗ NEVER place any subject behind furniture, chairs, objects, or other subjects
                ✗ NEVER give a person two hairstyles, two sets of hair, or duplicate hair
                ✗ NEVER leave a subject partially cut off by the frame edge
                ✗ NEVER carry blur, noise, or low resolution from a customer photo into
                  the final portrait — always reconstruct faces at full sharpness

                ══ THE COMPLETE CAST OF THE OUTPUT (exactly these, nothing else) ═════════
                {castList}
                Total: exactly {targetCount} subject(s). Adding or removing even one is a failure.

                ══ IMAGE ROLES ═════════════════════════════════════════════════════════════
                The NEXT image is the STYLE REFERENCE:
                  → Extract ONLY: painting medium, brushwork, colour palette, lighting mood,
                    background, and overall composition.
                  → The people/pets shown are ANONYMOUS MANNEQUINS. Ignore their faces,
                    genders, clothing, and identities completely. They do not exist.

                The FOLLOWING {uploadedCount} image(s) are CUSTOMER PHOTOS:
                  → These contain the REAL subjects: {uploadedSummary}.
                  → Every face in the final portrait must come exclusively from these photos.

                ══ MANDATORY RULES ══════════════════════════════════════════════════════════
                1. EXACT SUBJECT COUNT
                   Paint exactly {targetCount} subject(s).
                   • Template shows MORE → remove the extras, fill space naturally.
                   • Template shows FEWER → add the missing ones naturally.
                   • Never leave ghost silhouettes or empty spots.

                2. GROUP PHOTOS
                   One customer photo may contain multiple people. Count each visible
                   individual separately toward the {targetCount} total.

                3. GENDER & CLOTHING LOCK
                   Determine each subject's gender from THEIR customer photo only.
                   Paint them in gender-appropriate clothing that fits the portrait's
                   art style and era. The template's clothing is a style guide for
                   cut and formality — never for gender assignment.
                   If the template shows a woman in a dress but the customer photo shows
                   a man, paint the man in equivalent formal/period-appropriate men's attire.

                4. FACE & IDENTITY FIDELITY
                   Reproduce every face EXACTLY: bone structure, eye shape, eye colour,
                   nose, mouth, hair colour, hair style, and distinguishing features
                   (glasses, beard, freckles, etc.). Do NOT idealise or alter.

                5. HAIR — ONE HAIRSTYLE PER PERSON
                   Every person has exactly ONE hairstyle: the one visible in their
                   customer photo. Do not double the hair, do not layer two hairstyles,
                   do not add hair elements from the template. The hair should flow and
                   sit naturally, matching the customer photo in colour, length, and style.

                6. SKIN-TONE CONSISTENCY — CRITICAL
                   Measure the exact skin colour from the customer photo face.
                   Apply that SAME colour to neck, ears, hands, arms, and every centimetre
                   of exposed skin on that person. A face that is lighter or darker than
                   the neck is an absolute failure — recheck every skin boundary.

                7. BLUR & LOW-QUALITY PHOTO RECOVERY
                   If a customer photo is blurry, low-resolution, grainy, or out of focus:
                   RECONSTRUCT the face with maximum clarity and sharpness using the visible
                   facial structure as a guide. Render every feature — eyes, nose, mouth,
                   hair — at the full resolution of the output. Never replicate blur.

                8. COLOUR RESTORATION FOR OLD PHOTOS
                   If a customer photo is faded, yellowed, sepia-toned, or desaturated,
                   restore it to natural vibrant true-to-life colours BEFORE painting.

                9. ART STYLE FIDELITY
                   Replicate the painting technique, palette, and lighting of the
                   style reference exactly. Output must look hand-crafted in that medium.

                10. COMPOSITION & FRAMING — ALL SUBJECTS FULLY VISIBLE
                    Every subject must be:
                    • Fully within the frame — no cropping at head, shoulders, or body edges
                    • Clearly visible in the front layer — NOT behind chairs, tables, other
                      people, plants, or any objects
                    • Roughly on the same depth plane, all facing the viewer
                    • Naturally spaced so no one overlaps another's face
                    Rearrange the composition freely to meet these requirements.

                11. FINAL QUALITY
                    High-resolution output. Every face razor-sharp. No artifacts, no seams,
                    no half-rendered limbs, no floating objects, no doubled body parts.
                {extraRulesSection}
                ══ PORTRAIT THEME / CONTEXT ════════════════════════════════════════════════
                {request.Prompt}

                Generate the portrait now.
                """;

            // ── Assemble the Gemini request ──────────────────────────────────
            // Inline text labels before each image help the model know which
            // image is the style reference vs. which are the customer photos.
            var parts = new List<object>
            {
                new { text = instruction },
                new { text = "━━ STYLE REFERENCE — use for art style only, ignore all faces/identities ━━" },
                new
                {
                    inline_data = new
                    {
                        mime_type = "image/jpeg",
                        data = templateBase64
                    }
                }
            };

            // Label each customer photo individually
            for (int i = 0; i < customerParts.Count; i++)
            {
                var slot = (i < request.SubjectSlots.Count) ? request.SubjectSlots[i] : null;
                var slotLabel = slot != null
                    ? $"━━ CUSTOMER PHOTO {i + 1} — real subject to paint ({slot.SlotType}) ━━"
                    : $"━━ CUSTOMER PHOTO {i + 1} — real subject to paint ━━";
                parts.Add(new { text = slotLabel });
                parts.Add(customerParts[i]);
            }

            parts.Add(new { text = $"Now paint exactly {targetCount} subject(s) from the customer photos above, in the style of the style reference. Follow all rules strictly." });

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
