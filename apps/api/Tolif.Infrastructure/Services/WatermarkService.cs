using SixLabors.Fonts;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using Tolif.Application.Interfaces;

namespace Tolif.Infrastructure.Services;

/// <summary>
/// Burns a tiled diagonal watermark into an image using SixLabors.ImageSharp.
/// No AI calls — pure pixel manipulation.
/// </summary>
public sealed class WatermarkService : IWatermarkService
{
    private const string WatermarkText = "TOLIF PREVIEW";

    public byte[] Apply(byte[] imageBytes)
    {
        using var image = Image.Load<Rgba32>(imageBytes);
        image.Mutate(ctx => Watermark(ctx, image.Width, image.Height));

        using var ms = new MemoryStream();
        image.SaveAsJpeg(ms, new JpegEncoder { Quality = 85 });
        return ms.ToArray();
    }

    private static void Watermark(IImageProcessingContext ctx, int width, int height)
    {
        if (TryGetFont(Math.Max(width, height) * 0.055f, out var font))
            DrawTextWatermark(ctx, font, width, height);
        else
            DrawStripeWatermark(ctx, width, height);
    }

    // ── Text watermark (preferred) ────────────────────────────────────────────

    private static void DrawTextWatermark(IImageProcessingContext ctx, Font font, int width, int height)
    {
        var measureOpts = new TextOptions(font);
        var bounds      = TextMeasurer.MeasureSize(WatermarkText, measureOpts);

        float stepX = bounds.Width  * 1.6f;
        float stepY = bounds.Height * 4.0f;
        const float angle = -MathF.PI / 6f; // −30°

        var color = Color.FromRgba(255, 255, 255, 55); // white @ ~22 % opacity

        for (float y = -stepY; y < height + stepY; y += stepY)
        {
            // Offset every other row for a brick-pattern layout
            float rowOffset = ((int)(y / stepY) % 2 != 0) ? stepX / 2f : 0f;

            for (float x = -stepX + rowOffset; x < width + stepX; x += stepX)
            {
                var pivot     = new System.Numerics.Vector2(x + bounds.Width / 2f, y + bounds.Height / 2f);
                var transform = System.Numerics.Matrix3x2.CreateRotation(angle, pivot);

                var drawOpts = new DrawingOptions
                {
                    GraphicsOptions = new GraphicsOptions { Antialias = true },
                    Transform       = transform,
                };

                ctx.DrawText(drawOpts, WatermarkText, font, color, new PointF(x, y));
            }
        }
    }

    private static bool TryGetFont(float size, out Font font)
    {
        font = null!;

        // Prefer common cross-platform fonts; falls back to whatever is installed
        string[] candidates = ["Liberation Sans", "Arial", "DejaVu Sans", "FreeSans", "Noto Sans", "Ubuntu"];

        foreach (var name in candidates)
        {
            if (SystemFonts.TryGet(name, out var family))
            {
                font = family.CreateFont(size, FontStyle.Bold);
                return true;
            }
        }

        // Use any available font rather than giving up
        var all = SystemFonts.Families.ToArray();
        if (all.Length > 0)
        {
            font = all[0].CreateFont(size, FontStyle.Bold);
            return true;
        }

        return false;
    }

    // ── Stripe watermark (fallback when no system font found) ─────────────────

    private static void DrawStripeWatermark(IImageProcessingContext ctx, int width, int height)
    {
        var color = Color.FromRgba(255, 255, 255, 45);

        for (int i = -height; i < width + height; i += 80)
        {
            ctx.FillPolygon(color,
                new PointF(i,               0),
                new PointF(i + 35,          0),
                new PointF(i + 35 + height, height),
                new PointF(i          + height, height));
        }
    }
}
