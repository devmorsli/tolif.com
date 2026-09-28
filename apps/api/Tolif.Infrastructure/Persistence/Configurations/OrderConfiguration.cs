using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Tolif.Domain.Entities;

namespace Tolif.Infrastructure.Persistence.Configurations;

public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.HasKey(o => o.Id);
        builder.HasIndex(o => o.AccessToken).IsUnique();
        builder.HasIndex(o => o.StripeSessionId);
        builder.HasIndex(o => o.StripePaymentIntentId);
        builder.Property(o => o.CustomerEmail).HasMaxLength(320).IsRequired();
        builder.Property(o => o.Currency).HasMaxLength(3);
        builder.Property(o => o.TotalAmount).HasColumnType("numeric(10,2)");
        builder.Property(o => o.ShippingAddressJson).HasColumnType("jsonb");
        builder.HasOne(o => o.Customer).WithMany(c => c.Orders)
            .HasForeignKey(o => o.CustomerId).OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(o => o.DiscountCode).WithMany(d => d.Orders)
            .HasForeignKey(o => o.DiscountCodeId).OnDelete(DeleteBehavior.SetNull);
    }
}
