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
using Tolif.Infrastructure.AI;
using Tolif.Infrastructure.Jobs;
using Tolif.Infrastructure.Persistence;
using Tolif.Infrastructure.Services;
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
        services.AddScoped<ISettingsService, SettingsService>();

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
                ForcePathStyle = true
            };
            return new AmazonS3Client(new BasicAWSCredentials(accessKey, secretKey), s3Config);
        });
        services.AddScoped<IStorageService, S3StorageService>();
        services.AddSingleton<IWatermarkService, WatermarkService>();

        // ── AI Providers ────────────────────────────────────────────────────
        // Register concrete providers (used by FallbackImageGenerationProvider)
        services.AddScoped<GeminiImageGenerationProvider>();
        services.AddScoped<FalAiImageGenerationProvider>();
        services.AddScoped<OpenAiImageGenerationProvider>();
        // FallbackImageGenerationProvider is the main IImageGenerationProvider used everywhere
        services.AddScoped<IImageGenerationProvider, FallbackImageGenerationProvider>();

        // ── Email ──────────────────────────────────────────────────────────
        services.AddHttpClient("resend");
        services.AddScoped<MailKitEmailService>();
        services.AddScoped<ResendEmailService>();
        services.AddScoped<IEmailService, RoutingEmailService>();
        services.AddScoped<IOrderEmailService, OrderEmailService>();

        // ── Analytics ─────────────────────────────────────────────────────
        services.AddScoped<IAnalyticsService, AnalyticsService>();

        // ── Print providers ────────────────────────────────────────────────
        services.AddHttpClient("printful");
        services.AddHttpClient("printify");
        services.AddScoped<IPrintfulService, PrintfulService>();
        // Register both as IPrintProvider for the SubmitPrintOrderJob to resolve
        services.AddScoped<IPrintProvider, PrintfulAdapterService>();
        services.AddScoped<IPrintProvider, PrintifyService>();

        // ── Background jobs ────────────────────────────────────────────────
        services.AddScoped<GenerateHighResJob>();
        services.AddScoped<SendOrderEmailJob>();
        services.AddScoped<SubmitPrintOrderJob>();
        services.AddScoped<DeleteExpiredPhotosJob>();
        services.AddScoped<CleanupOrphanedUploadsJob>();

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
