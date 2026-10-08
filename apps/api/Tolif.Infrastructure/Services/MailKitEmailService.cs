using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using MimeKit;
using Tolif.Application.Interfaces;

namespace Tolif.Infrastructure.Services;

public class MailKitEmailService(ISettingsService settings, ILogger<MailKitEmailService> logger) : IEmailService
{
    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        var host     = await settings.GetAsync("email.smtpHost",     ct) ?? "localhost";
        var portStr  = await settings.GetAsync("email.smtpPort",     ct) ?? "587";
        var user     = await settings.GetAsync("email.smtpUser",     ct) ?? "";
        var password = await settings.GetAsync("email.smtpPassword", ct) ?? "";
        var from     = await settings.GetAsync("email.fromAddress",  ct) ?? "noreply@tolif.com";
        var fromName = await settings.GetAsync("email.fromName",     ct) ?? "Tolif";

        if (!int.TryParse(portStr, out var port)) port = 587;

        var email = new MimeMessage();
        email.From.Add(new MailboxAddress(fromName, from));
        email.To.Add(MailboxAddress.Parse(message.To));
        email.Subject = message.Subject;
        email.Body    = new BodyBuilder
        {
            HtmlBody  = message.HtmlBody,
            TextBody  = message.PlainTextBody
        }.ToMessageBody();

        using var smtp = new SmtpClient();
        try
        {
            await smtp.ConnectAsync(host, port, SecureSocketOptions.StartTls, ct);
            if (!string.IsNullOrWhiteSpace(user))
                await smtp.AuthenticateAsync(user, password, ct);
            await smtp.SendAsync(email, ct);
            await smtp.DisconnectAsync(true, ct);
            logger.LogInformation("Email sent to {To} — {Subject}", message.To, message.Subject);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send email to {To}", message.To);
            throw;
        }
    }
}
