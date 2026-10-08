namespace Tolif.Application.Interfaces;

public static class AnalyticsEventType
{
    public const string PageView           = "page_view";
    public const string TemplateViewed     = "template_viewed";
    public const string UploadStarted      = "upload_started";
    public const string PreviewGenerated   = "preview_generated";
    public const string CheckoutStarted    = "checkout_started";
    public const string OrderPaid          = "order_paid";
    public const string GenerationFailed   = "generation_failed";
    public const string RegenerationUsed   = "regeneration_used";
}

public interface IAnalyticsService
{
    /// <summary>
    /// Fire-and-forget event tracking — never throws, never blocks the caller.
    /// </summary>
    Task TrackAsync(
        string eventType,
        string? sessionId      = null,
        object? data           = null,
        CancellationToken ct   = default);
}
