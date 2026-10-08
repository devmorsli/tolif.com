namespace Tolif.Application.Interfaces;

public interface IWatermarkService
{
    /// <summary>
    /// Burns a tiled diagonal "TOLIF PREVIEW" watermark into the image bytes
    /// and returns the result as JPEG. Pure code — no AI calls.
    /// </summary>
    byte[] Apply(byte[] imageBytes);
}
