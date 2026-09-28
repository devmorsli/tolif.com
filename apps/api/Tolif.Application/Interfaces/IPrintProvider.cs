using Tolif.Domain.Enums;

namespace Tolif.Application.Interfaces;

public record PrintOrderRequest(
    Guid OrderId,
    string CustomerName,
    string CustomerEmail,
    string ShippingAddressJson,
    IReadOnlyList<PrintLineItem> LineItems
);

public record PrintLineItem(
    string ProviderVariantId,
    int Quantity,
    string PrintFileKey  // S3 key; provider fetches via signed URL
);

public record PrintOrderResult(
    bool Success,
    string? ProviderOrderId,
    string? ErrorMessage = null
);

public interface IPrintProvider
{
    PrintProvider ProviderType { get; }
    Task<PrintOrderResult> SubmitOrderAsync(PrintOrderRequest request, CancellationToken ct = default);
    Task CancelOrderAsync(string providerOrderId, CancellationToken ct = default);
}
