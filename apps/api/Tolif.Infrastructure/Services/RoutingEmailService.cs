using Tolif.Application.Interfaces;

namespace Tolif.Infrastructure.Services;

/// <summary>
/// Reads <c>email.provider</c> from the DB settings at send-time and
/// delegates to the matching implementation.
/// Switching providers in Admin → Settings takes effect immediately —
/// no restart or redeploy needed.
/// </summary>
public class RoutingEmailService(
    ISettingsService settings,
    ResendEmailService resend,
    MailKitEmailService mailKit) : IEmailService
{
    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        var provider = (await settings.GetAsync("email.provider", ct) ?? "smtp")
            .Trim().ToLowerInvariant();

        IEmailService svc = provider switch
        {
            "resend" => resend,
            _        => mailKit,   // "smtp" or anything else → MailKit
        };

        await svc.SendAsync(message, ct);
    }
}
