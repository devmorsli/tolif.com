using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;
using Tolif.Application.Interfaces;
using Tolif.Domain.Entities;
using Tolif.Domain.Enums;

namespace Tolif.API.Controllers;

[ApiController]
[Route("api/checkout")]
public class CheckoutController(
    IApplicationDbContext            db,
    ISettingsService                 settings,
    ILogger<CheckoutController>      logger) : ControllerBase
{
    // ── POST /api/checkout/session ────────────────────────────────────────────
    /// <summary>
    /// Creates an Order in the database and a Stripe Checkout Session.
    /// Returns the Stripe session URL to redirect the customer to.
    ///
    /// Body:
    /// {
    ///   "items": [
    ///     { "sessionId": "guid", "variantId": "guid", "quantity": 1 },
    ///     ...
    ///   ],
    ///   "customerEmail":   "...",
    ///   "customerName":    "...",           // optional
    ///   "shippingAddress": { ... },         // required for physical products
    ///   "discountCode":    "SAVE10"         // optional
    /// }
    /// </summary>
    [HttpPost("session")]
    [EnableRateLimiting("checkout")]
    public async Task<IActionResult> CreateSession(
        [FromBody] CreateCheckoutRequest req,
        CancellationToken ct)
    {
        if (req.Items is null || req.Items.Count == 0)
            return BadRequest(new { message = "At least one item is required." });

        // ── Validate each item ─────────────────────────────────────────────
        var resolvedItems = new List<ResolvedItem>();

        foreach (var reqItem in req.Items)
        {
            if (!Guid.TryParse(reqItem.SessionId, out var sessionId))
                return BadRequest(new { message = $"Invalid sessionId: {reqItem.SessionId}" });

            var portraitSession = await db.PortraitSessions
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == sessionId, ct);

            if (portraitSession is null)
                return NotFound(new { message = $"Portrait session not found: {reqItem.SessionId}" });

            if (portraitSession.Status != PortraitSessionStatus.PreviewReady)
                return BadRequest(new { message = $"Portrait session is not ready for checkout: {reqItem.SessionId}" });

            if (!Guid.TryParse(reqItem.VariantId, out var variantId))
                return BadRequest(new { message = $"Invalid variantId: {reqItem.VariantId}" });

            var variant = await db.ProductVariants
                .Include(v => v.Product)
                .AsNoTracking()
                .FirstOrDefaultAsync(v => v.Id == variantId && v.IsActive, ct);

            if (variant is null)
                return NotFound(new { message = $"Product variant not found: {reqItem.VariantId}" });

            resolvedItems.Add(new ResolvedItem(sessionId, variant, reqItem.Quantity));
        }

        // ── Validate discount code (optional) ─────────────────────────────
        DiscountCode? discount = null;
        if (!string.IsNullOrWhiteSpace(req.DiscountCode))
        {
            discount = await db.DiscountCodes.FirstOrDefaultAsync(
                d => d.Code == req.DiscountCode &&
                     d.IsActive &&
                     (d.ExpiresAt == null || d.ExpiresAt > DateTime.UtcNow) &&
                     (d.MaxUses == null || d.Uses < d.MaxUses), ct);

            if (discount is null)
                return BadRequest(new { message = "Discount code is invalid or expired." });
        }

        // ── Stripe config ──────────────────────────────────────────────────
        var stripeSecretKey = await settings.GetAsync("stripe.secretKey", ct);
        if (string.IsNullOrWhiteSpace(stripeSecretKey))
            return StatusCode(500, new { message = "Stripe is not configured." });

        StripeConfiguration.ApiKey = stripeSecretKey;

        var siteUrl = await settings.GetAsync("site.url", ct) ?? "https://tolif.com";

        // ── Calculate order total ──────────────────────────────────────────
        var currency = resolvedItems[0].Variant.Currency.ToLowerInvariant();

        decimal rawTotal = resolvedItems.Sum(i => i.Variant.Price * i.Quantity);

        long amountInCents;
        string? stripeCouponId = null;

        if (discount is not null)
        {
            stripeCouponId = discount.StripeCouponId;
            amountInCents  = discount.Type == "percent"
                ? (long)Math.Round(rawTotal * (1 - discount.Value / 100m) * 100)
                : (long)Math.Max(0, (rawTotal - discount.Value) * 100);
        }
        else
        {
            amountInCents = (long)Math.Round(rawTotal * 100);
        }

        // ── Stripe minimum charge guard ────────────────────────────────────
        var stripeMinCents = currency == "gbp" ? 30L : 50L;
        if (amountInCents < stripeMinCents)
        {
            var minFormatted = (stripeMinCents / 100m).ToString("0.00");
            return BadRequest(new
            {
                message = $"Order total is below Stripe's minimum charge " +
                          $"({currency.ToUpperInvariant()} {minFormatted}). " +
                          $"Please update the product price in the admin panel."
            });
        }

        // ── Create Order in DB (Pending) ───────────────────────────────────
        var order = new Domain.Entities.Order
        {
            Id             = Guid.NewGuid(),
            CustomerEmail  = req.CustomerEmail,
            CustomerName   = req.CustomerName,
            Status         = OrderStatus.Pending,
            TotalAmount    = amountInCents / 100m,
            Currency       = resolvedItems[0].Variant.Currency,
            DiscountCodeId = discount?.Id,
            ShippingAddressJson = req.ShippingAddress is null
                ? null
                : System.Text.Json.JsonSerializer.Serialize(req.ShippingAddress),
            CreatedAt      = DateTime.UtcNow,
            UpdatedAt      = DateTime.UtcNow,
        };

        foreach (var item in resolvedItems)
        {
            order.Items.Add(new OrderItem
            {
                Id                = Guid.NewGuid(),
                OrderId           = order.Id,
                ProductVariantId  = item.Variant.Id,
                PortraitSessionId = item.SessionId,
                Quantity          = item.Quantity,
                UnitPrice         = item.Variant.Price,
                Currency          = item.Variant.Currency,
                CreatedAt         = DateTime.UtcNow,
                UpdatedAt         = DateTime.UtcNow,
            });
        }

        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);

        // ── Build Stripe line items (one per portrait) ─────────────────────
        var isPhysical = resolvedItems.Any(i => i.Variant.Product?.Type != ProductType.Digital);

        var lineItems = resolvedItems.Select(item => new SessionLineItemOptions
        {
            PriceData = new SessionLineItemPriceDataOptions
            {
                Currency    = item.Variant.Currency.ToLowerInvariant(),
                UnitAmount  = (long)Math.Round(item.Variant.Price * 100),
                ProductData = new SessionLineItemPriceDataProductDataOptions
                {
                    Name        = $"{item.Variant.Product?.Name ?? "AI Portrait"} — {item.Variant.Size}",
                    Description = "Custom AI-generated portrait by Tolif",
                },
            },
            Quantity = item.Quantity,
        }).ToList();

        // ── Create Stripe Checkout Session ─────────────────────────────────
        var options = new SessionCreateOptions
        {
            PaymentMethodTypes = ["card"],
            LineItems          = lineItems,
            Mode               = "payment",
            CustomerEmail      = req.CustomerEmail,
            SuccessUrl         = $"{siteUrl}/order/{order.AccessToken}?success=1",
            CancelUrl          = $"{siteUrl}/create?cancelled=1",
            Metadata           = new Dictionary<string, string>
            {
                ["orderId"]    = order.Id.ToString(),
                ["sessionIds"] = string.Join(",", resolvedItems.Select(i => i.SessionId.ToString())),
            },
            Discounts = stripeCouponId is null
                ? null
                : [new SessionDiscountOptions { Coupon = stripeCouponId }],
            ShippingAddressCollection = isPhysical
                ? new SessionShippingAddressCollectionOptions
                  {
                      AllowedCountries = ["FR", "DE", "GB", "US", "CA", "NL", "BE", "ES", "IT", "PT"]
                  }
                : null,
        };

        try
        {
            var service       = new SessionService();
            var stripeSession = await service.CreateAsync(options, cancellationToken: ct);

            var savedOrder = await db.Orders.FindAsync([order.Id], ct);
            if (savedOrder is not null)
            {
                savedOrder.StripeSessionId = stripeSession.Id;
                await db.SaveChangesAsync(ct);
            }

            return Ok(new
            {
                checkoutUrl = stripeSession.Url,
                orderId     = order.Id,
                sessionId   = stripeSession.Id,
            });
        }
        catch (StripeException ex)
        {
            logger.LogError(ex, "Stripe session creation failed for order {OrderId}", order.Id);
            return StatusCode(500, new { message = "Could not create Stripe checkout session.", detail = ex.Message });
        }
    }

    private sealed record ResolvedItem(Guid SessionId, ProductVariant Variant, int Quantity);
}

public record CreateCheckoutRequest(
    List<CheckoutItem> Items,
    string CustomerEmail,
    string? CustomerName,
    ShippingAddressDto? ShippingAddress,
    string? DiscountCode
);

public record CheckoutItem(
    string SessionId,
    string VariantId,
    int    Quantity
);

public record ShippingAddressDto(
    string Line1,
    string? Line2,
    string City,
    string? State,
    string PostalCode,
    string Country
);
