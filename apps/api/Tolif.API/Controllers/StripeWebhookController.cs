using Hangfire;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Stripe;
using Tolif.Application.Interfaces;
using Tolif.Domain.Enums;
using Tolif.Infrastructure.Jobs;

namespace Tolif.API.Controllers;

[ApiController]
[Route("api/webhooks/stripe")]
public class StripeWebhookController(
    IApplicationDbContext            db,
    ISettingsService                 settings,
    IBackgroundJobClient             hangfire,
    IAnalyticsService                analytics,
    ILogger<StripeWebhookController> logger) : ControllerBase
{
    [HttpPost]
    [DisableRequestSizeLimit]
    public async Task<IActionResult> Handle(CancellationToken ct)
    {
        Request.EnableBuffering();

        var webhookSecret = await settings.GetAsync("stripe.webhookSecret", ct);
        var hasSecret     = !string.IsNullOrWhiteSpace(webhookSecret);

        if (!hasSecret && !Request.Headers.ContainsKey("stripe-signature"))
        {
            if (!HttpContext.RequestServices
                    .GetRequiredService<IHostEnvironment>().IsDevelopment())
                return BadRequest("Webhook secret not configured");
        }

        string json;
        using (var reader = new StreamReader(Request.Body))
            json = await reader.ReadToEndAsync(ct);

        Event stripeEvent;
        try
        {
            if (hasSecret)
            {
                var sig = Request.Headers["stripe-signature"].FirstOrDefault() ?? "";
                stripeEvent = EventUtility.ConstructEvent(json, sig, webhookSecret!,
                    throwOnApiVersionMismatch: false);
            }
            else
            {
                stripeEvent = EventUtility.ParseEvent(json);
            }
        }
        catch (StripeException ex)
        {
            logger.LogWarning("Stripe webhook signature validation failed: {Message}", ex.Message);
            return BadRequest($"Webhook error: {ex.Message}");
        }

        logger.LogInformation("Stripe event: {Type} / {Id}", stripeEvent.Type, stripeEvent.Id);

        switch (stripeEvent.Type)
        {
            case EventTypes.PaymentIntentSucceeded:
                await HandlePaymentIntentSucceeded((PaymentIntent)stripeEvent.Data.Object, ct);
                break;

            case EventTypes.CheckoutSessionCompleted:
                await HandleCheckoutSessionCompleted((Stripe.Checkout.Session)stripeEvent.Data.Object, ct);
                break;

            case EventTypes.PaymentIntentPaymentFailed:
                await HandlePaymentFailed((PaymentIntent)stripeEvent.Data.Object, ct);
                break;

            default:
                logger.LogDebug("Unhandled Stripe event: {Type}", stripeEvent.Type);
                break;
        }

        return Ok();
    }

    // ── payment_intent.succeeded ──────────────────────────────────────────────
    private async Task HandlePaymentIntentSucceeded(PaymentIntent pi, CancellationToken ct)
    {
        var order = await db.Orders
            .FirstOrDefaultAsync(o => o.StripePaymentIntentId == pi.Id, ct);

        if (order is null) { logger.LogWarning("No order for PI {Id}", pi.Id); return; }
        if (order.Status is OrderStatus.Paid or OrderStatus.Ready or OrderStatus.Shipped)
        { logger.LogInformation("Order {Id} already paid", order.Id); return; }

        order.Status    = OrderStatus.Paid;
        order.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        _ = analytics.TrackAsync(AnalyticsEventType.OrderPaid, null,
            new { orderId = order.Id, amount = order.TotalAmount, currency = order.Currency });
        EnqueuePostPaymentJobs(order.Id);
    }

    // ── checkout.session.completed ────────────────────────────────────────────
    private async Task HandleCheckoutSessionCompleted(Stripe.Checkout.Session session, CancellationToken ct)
    {
        var order = await db.Orders
            .FirstOrDefaultAsync(o =>
                o.StripeSessionId == session.Id ||
                (session.PaymentIntentId != null && o.StripePaymentIntentId == session.PaymentIntentId), ct);

        if (order is null) { logger.LogWarning("No order for Session {Id}", session.Id); return; }
        if (order.Status is OrderStatus.Paid or OrderStatus.Ready or OrderStatus.Shipped) return;

        if (!string.IsNullOrEmpty(session.PaymentIntentId))
            order.StripePaymentIntentId = session.PaymentIntentId;

        order.Status    = OrderStatus.Paid;
        order.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        _ = analytics.TrackAsync(AnalyticsEventType.OrderPaid, null,
            new { orderId = order.Id, amount = order.TotalAmount, currency = order.Currency });
        EnqueuePostPaymentJobs(order.Id);
    }

    // ── payment_intent.payment_failed ─────────────────────────────────────────
    private async Task HandlePaymentFailed(PaymentIntent pi, CancellationToken ct)
    {
        var order = await db.Orders
            .FirstOrDefaultAsync(o => o.StripePaymentIntentId == pi.Id, ct);
        if (order is null || order.Status != OrderStatus.Pending) return;

        order.Status    = OrderStatus.Cancelled;
        order.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Order {Id} cancelled after payment failure", order.Id);
    }

    // ── Post-payment job chain ─────────────────────────────────────────────────
    /// <summary>
    /// 1. Send confirmation email immediately (fire and forget).
    /// 2. Generate the high-res portrait.
    /// 3. Submit to print provider (enqueued inside GenerateHighResJob on completion).
    /// </summary>
    private void EnqueuePostPaymentJobs(Guid orderId)
    {
        // Email: send immediately
        hangfire.Enqueue<SendOrderEmailJob>(j => j.ExecuteAsync(orderId, CancellationToken.None));

        // High-res generation: can run in parallel with email
        var highResJobId = hangfire.Enqueue<GenerateHighResJob>(
            j => j.ExecuteAsync(orderId, CancellationToken.None));

        // Print submission: runs after high-res is done
        hangfire.ContinueJobWith<SubmitPrintOrderJob>(
            highResJobId,
            j => j.ExecuteAsync(orderId, CancellationToken.None));

        logger.LogInformation("Enqueued post-payment jobs for order {OrderId}", orderId);
    }
}
