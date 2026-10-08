using Microsoft.EntityFrameworkCore;
using Tolif.Domain.Entities;

namespace Tolif.Application.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Template> Templates { get; }
    DbSet<Customer> Customers { get; }
    DbSet<Order> Orders { get; }
    DbSet<OrderItem> OrderItems { get; }
    DbSet<PortraitSession> PortraitSessions { get; }
    DbSet<AiGenerationLog> AiGenerationLogs { get; }
    DbSet<Product> Products { get; }
    DbSet<ProductVariant> ProductVariants { get; }
    DbSet<PrintOrder> PrintOrders { get; }
    DbSet<DiscountCode> DiscountCodes { get; }
    DbSet<Setting> Settings { get; }
    DbSet<AnalyticsEvent> AnalyticsEvents { get; }
    DbSet<Review> Reviews { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
