using Tolif.Domain.Entities;

namespace Tolif.Application.Interfaces;

public interface IOrderEmailService
{
    Task SendOrderConfirmationAsync(Order order, CancellationToken ct = default);
    Task SendAbandonmentEmailAsync(Order order, CancellationToken ct = default);
}
