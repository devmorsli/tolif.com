namespace Tolif.Application.Interfaces;

// ── Categories ─────────────────────────────────────────────────────────────────

public record PrintfulCategory(long Id, string Title, string? ImageUrl);

// ── Catalog ────────────────────────────────────────────────────────────────────

public record PrintfulCatalogProduct(
    long ProductId,
    string Name,
    string Type,
    string? Image,
    IReadOnlyList<PrintfulCatalogVariant> Variants
);

public record PrintfulCatalogVariant(
    long VariantId,
    string Name,
    string? Size,
    string? Color,
    decimal Price,
    string Currency
);

// ── Shipping ───────────────────────────────────────────────────────────────────

public record PrintfulShippingRequest(
    string RecipientCountryCode,
    string RecipientStateCode,
    string RecipientCity,
    string RecipientZip,
    IReadOnlyList<PrintfulShippingItem> Items
);

public record PrintfulShippingItem(long VariantId, int Quantity);

public record PrintfulShippingRate(
    string Id,
    string Name,
    decimal Rate,
    string Currency,
    int? MinDays,
    int? MaxDays
);

// ── Orders ─────────────────────────────────────────────────────────────────────

public record PrintfulDraftOrderRequest(
    string RecipientName,
    string RecipientAddress1,
    string? RecipientAddress2,
    string RecipientCity,
    string RecipientStateCode,
    string RecipientCountryCode,
    string RecipientZip,
    string RecipientEmail,
    string RecipientPhone,
    IReadOnlyList<PrintfulDraftItem> Items
);

public record PrintfulDraftItem(
    long VariantId,
    int Quantity,
    string PrintFileUrl,   // presigned URL to the high-res file
    string Placement,      // e.g. "front" — from GetVariantPlacementAsync
    string Technique,      // e.g. "digital" — from GetVariantPlacementAsync
    string? Label = null
);

public record PrintfulDraftResult(
    bool Success,
    string? PrintfulOrderId,
    string? DashboardUrl,
    string? ErrorMessage = null
);

// ── Webhooks ───────────────────────────────────────────────────────────────────

public record PrintfulWebhook(
    long Id,
    string Url,
    IReadOnlyList<string> Types
);

// ── Variant placement lookup (v2) ─────────────────────────────────────────────

public record PrintfulPlacementInfo(
    string Placement,
    string Technique
);

// ── Service interface ──────────────────────────────────────────────────────────

public interface IPrintfulService
{
    /// <summary>Verify the stored API key works. Returns null on success, error message on failure.</summary>
    Task<string?> TestConnectionAsync(CancellationToken ct = default);

    /// <summary>List all Printful product categories.</summary>
    Task<IReadOnlyList<PrintfulCategory>> GetCategoriesAsync(CancellationToken ct = default);

    /// <summary>Pull all products (without variants) from Printful and return them.</summary>
    Task<IReadOnlyList<PrintfulCatalogProduct>> SyncCatalogAsync(CancellationToken ct = default);

    /// <summary>Pull products from a specific Printful category.</summary>
    Task<IReadOnlyList<PrintfulCatalogProduct>> SyncCategoryAsync(long categoryId, CancellationToken ct = default);

    /// <summary>Fetch variants for a single catalog product by its Printful product ID.</summary>
    Task<IReadOnlyList<PrintfulCatalogVariant>> GetProductVariantsAsync(long productId, CancellationToken ct = default);

    /// <summary>
    /// For a catalog variant ID, look up the first available placement + technique
    /// by querying /v2/catalog-variants/{id} then /v2/catalog-products/{productId}.
    /// Returns null if the lookup fails.
    /// </summary>
    Task<PrintfulPlacementInfo?> GetVariantPlacementAsync(long variantId, CancellationToken ct = default);

    /// <summary>Upload a file (by public URL) to the Printful file library; returns the Printful file ID.</summary>
    Task<string> UploadFileAsync(string publicUrl, string fileName, CancellationToken ct = default);

    /// <summary>Create a draft order (not yet submitted to production).</summary>
    Task<PrintfulDraftResult> CreateDraftOrderAsync(PrintfulDraftOrderRequest request, CancellationToken ct = default);

    /// <summary>Confirm a draft order after payment succeeds.</summary>
    Task<PrintfulDraftResult> ConfirmOrderAsync(string printfulOrderId, CancellationToken ct = default);

    /// <summary>Cancel an order at Printful.</summary>
    Task CancelOrderAsync(string printfulOrderId, CancellationToken ct = default);

    /// <summary>Estimate shipping rates for a basket.</summary>
    Task<IReadOnlyList<PrintfulShippingRate>> GetShippingRatesAsync(
        PrintfulShippingRequest request, CancellationToken ct = default);

    /// <summary>List webhooks registered for this store.</summary>
    Task<IReadOnlyList<PrintfulWebhook>> GetWebhooksAsync(CancellationToken ct = default);

    /// <summary>Register the set of webhooks Tolif needs (replaces existing).</summary>
    Task RegisterWebhooksAsync(string baseUrl, CancellationToken ct = default);
}
