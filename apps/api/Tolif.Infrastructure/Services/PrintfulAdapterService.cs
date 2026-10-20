using System.Text.Json;
using Microsoft.Extensions.Logging;
using Tolif.Application.Interfaces;
using Tolif.Domain.Enums;

namespace Tolif.Infrastructure.Services;

/// <summary>
/// Adapts IPrintfulService (the rich Printful client) to the simpler
/// IPrintProvider interface used by SubmitPrintOrderJob.
/// </summary>
public sealed class PrintfulAdapterService(
    IPrintfulService printfulService,
    IStorageService  storageService,
    ILogger<PrintfulAdapterService> logger) : IPrintProvider
{
    public PrintProvider ProviderType => PrintProvider.Printful;

    public async Task<PrintOrderResult> SubmitOrderAsync(PrintOrderRequest request, CancellationToken ct = default)
    {
        try
        {
            // Deserialise shipping address
            var addr = JsonSerializer.Deserialize<ShippingAddress>(
                           request.ShippingAddressJson,
                           new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                       ?? throw new InvalidOperationException("Invalid shipping address JSON.");

            // Build line items
            var draftItems = new List<PrintfulDraftItem>();
            foreach (var li in request.LineItems)
            {
                if (!long.TryParse(li.ProviderVariantId, out var variantId))
                    throw new InvalidOperationException($"Printful variant ID must be numeric, got: {li.ProviderVariantId}");

                // Look up the correct placement + technique for this variant from Printful v2 catalog
                var placementInfo = await printfulService.GetVariantPlacementAsync(variantId, ct);
                if (placementInfo is null)
                    throw new InvalidOperationException(
                        $"Could not retrieve placement info for Printful variant {variantId}. " +
                        "Check the Printful API key and variant ID.");

                // Generate a presigned URL so Printful can fetch the file when creating the draft
                var presignedUrl = await storageService.GenerateDownloadUrlAsync(
                    li.PrintFileKey, TimeSpan.FromHours(1), ct);
                logger.LogInformation("[Printful] Portrait URL for Printful: {Url}", presignedUrl);

                draftItems.Add(new PrintfulDraftItem(
                    VariantId:    variantId,
                    Quantity:     li.Quantity,
                    Placement:    placementInfo.Placement,
                    Technique:    placementInfo.Technique,
                    PrintFileUrl: presignedUrl));
            }

            var draftRequest = new PrintfulDraftOrderRequest(
                RecipientName:         request.CustomerName,
                RecipientAddress1:     addr.Line1,
                RecipientAddress2:     addr.Line2,
                RecipientCity:         addr.City,
                RecipientStateCode:    addr.State ?? "",
                RecipientCountryCode:  addr.Country,
                RecipientZip:          addr.PostalCode,
                RecipientEmail:        request.CustomerEmail,
                RecipientPhone:        "",
                Items:                 draftItems);

            var draft = await printfulService.CreateDraftOrderAsync(draftRequest, ct);
            if (!draft.Success)
                return new PrintOrderResult(false, null, draft.ErrorMessage);

            logger.LogInformation("[Printful] Draft order {DraftId} created. Starting cost calculation poll.", draft.PrintfulOrderId);

            // Per Printful v2 docs: poll GET /v2/orders/{id} until costs.calculation_status == "completed"
            // before calling confirmation. Max ~3 minutes total (20 polls × 10s).
            const int maxPollAttempts = 20;
            string? lastStatus = null;
            for (int poll = 1; poll <= maxPollAttempts; poll++)
            {
                await Task.Delay(TimeSpan.FromSeconds(10), ct);
                var costStatus = await printfulService.GetOrderCostStatusAsync(draft.PrintfulOrderId!, ct);
                lastStatus = costStatus;
                logger.LogInformation("[Printful] Poll {Poll}/{Max} for order {DraftId}: calculation_status = {Status}",
                    poll, maxPollAttempts, draft.PrintfulOrderId, costStatus ?? "(null)");
                if (costStatus == "completed") break;
                if (costStatus == "failed")
                    return new PrintOrderResult(false, draft.PrintfulOrderId,
                        "Printful cost calculation failed for draft order.");
                if (poll == maxPollAttempts)
                    return new PrintOrderResult(false, draft.PrintfulOrderId,
                        $"Timed out waiting for Printful cost calculations. Last status: {lastStatus ?? "null"}",
                        PendingAtProvider: true);
            }

            // Costs are ready — confirm once
            var confirm = await printfulService.ConfirmOrderAsync(draft.PrintfulOrderId!, ct);
            if (!confirm.Success)
                return new PrintOrderResult(false, draft.PrintfulOrderId, confirm.ErrorMessage);

            return new PrintOrderResult(true, draft.PrintfulOrderId);
        }
        catch (Exception ex)
        {
            return new PrintOrderResult(false, null, ex.Message);
        }
    }

    public async Task CancelOrderAsync(string providerOrderId, CancellationToken ct = default)
        => await printfulService.CancelOrderAsync(providerOrderId, ct);

    private record ShippingAddress(
        string Line1,
        string? Line2,
        string City,
        string? State,
        string PostalCode,
        string Country);
}
