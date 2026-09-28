using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Tolif.Domain.Entities;

namespace Tolif.Infrastructure.Persistence.Configurations;

public class AnalyticsEventConfiguration : IEntityTypeConfiguration<AnalyticsEvent>
{
    public void Configure(EntityTypeBuilder<AnalyticsEvent> builder)
    {
        builder.HasKey(e => e.Id);
        builder.HasIndex(e => e.EventType);
        builder.HasIndex(e => e.CreatedAt);
        builder.Property(e => e.DataJson).HasColumnType("jsonb").HasDefaultValue("{}");
        builder.Property(e => e.EventType).HasMaxLength(100).IsRequired();
        builder.Property(e => e.IpAddress).HasMaxLength(45);
    }
}
