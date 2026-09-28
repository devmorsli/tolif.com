using Amazon.Runtime;
using Amazon.S3;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Tolif.Application.Interfaces;
using Tolif.Infrastructure.Persistence;
using Tolif.Infrastructure.Storage;

namespace Tolif.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration config)
    {
        // ── Database ────────────────────────────────────────────────────────
        var connectionString = BuildConnectionString(config);
        services.AddDbContext<ApplicationDbContext>(opts =>
            opts.UseNpgsql(connectionString,
                npgsql => npgsql.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.GetName().Name)));

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());

        // ── Identity ────────────────────────────────────────────────────────
        services.AddIdentity<AdminUser, IdentityRole>(opts =>
        {
            opts.Password.RequiredLength = 8;
            opts.Password.RequireDigit = true;
            opts.Password.RequireNonAlphanumeric = true;
        })
        .AddEntityFrameworkStores<ApplicationDbContext>()
        .AddDefaultTokenProviders();

        // ── Data Protection (for encrypting Settings values) ────────────────
        var dpPath = config["DATA_PROTECTION_KEYS_PATH"] ?? "/app/dataprotection-keys";
        services.AddDataProtection()
            .PersistKeysToFileSystem(new DirectoryInfo(dpPath))
            .SetApplicationName("Tolif");

        // ── S3 / MinIO ──────────────────────────────────────────────────────
        services.AddSingleton<IAmazonS3>(_ =>
        {
            var endpoint  = config["S3_ENDPOINT"] ?? config["MINIO_ENDPOINT"] ?? "http://minio:9000";
            var accessKey = config["S3_ACCESS_KEY"] ?? config["MINIO_ROOT_USER"] ?? "minioadmin";
            var secretKey = config["S3_SECRET_KEY"] ?? config["MINIO_ROOT_PASSWORD"] ?? "minioadmin";

            var s3Config = new AmazonS3Config
            {
                ServiceURL = endpoint,
                ForcePathStyle = true   // required for MinIO and most S3-compatible services
            };
            return new AmazonS3Client(new BasicAWSCredentials(accessKey, secretKey), s3Config);
        });
        services.AddScoped<IStorageService, S3StorageService>();

        // ── Hangfire ────────────────────────────────────────────────────────
        services.AddHangfire(hf => hf
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UsePostgreSqlStorage(opts => opts.UseNpgsqlConnection(connectionString)));
        services.AddHangfireServer();

        return services;
    }

    private static string BuildConnectionString(IConfiguration config) =>
        $"Host={config["POSTGRES_HOST"] ?? "postgres"};" +
        $"Port={config["POSTGRES_PORT"] ?? "5432"};" +
        $"Database={config["POSTGRES_DB"] ?? "tolif"};" +
        $"Username={config["POSTGRES_USER"] ?? "tolif"};" +
        $"Password={config["POSTGRES_PASSWORD"] ?? "tolif"};";
}
