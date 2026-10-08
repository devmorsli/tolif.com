using System.Text;
using System.Threading.RateLimiting;
using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Util;
using Hangfire;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Tolif.Infrastructure;
using Tolif.Infrastructure.Jobs;
using Tolif.Infrastructure.Persistence;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // ── Serilog ─────────────────────────────────────────────────────────────
    builder.Host.UseSerilog((ctx, cfg) => cfg
        .ReadFrom.Configuration(ctx.Configuration)
        .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}"));

    // ── Infrastructure (DB, Identity, S3, Hangfire) ───────────────────────
    builder.Services.AddInfrastructure(builder.Configuration);
    builder.Services.AddControllers();
    builder.Services.AddHttpClient();
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddOpenApi();

    // ── JWT Authentication ────────────────────────────────────────────────
    builder.Services.AddAuthentication()
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(builder.Configuration["JWT_SECRET"] ?? "tolif-dev-secret-change-in-production"))
            };
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = ctx =>
                {
                    if (ctx.Request.Cookies.TryGetValue("admin_token", out var cookieToken))
                        ctx.Token = cookieToken;
                    return Task.CompletedTask;
                }
            };
        });

    builder.Services.PostConfigure<Microsoft.AspNetCore.Authentication.AuthenticationOptions>(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultScheme             = JwtBearerDefaults.AuthenticationScheme;
    });

    builder.Services.AddAuthorization();

    // ── CORS ─────────────────────────────────────────────────────────────────
    builder.Services.AddCors(opts => opts.AddPolicy("Frontend", policy =>
    {
        var configOrigins = builder.Configuration["ALLOWED_ORIGINS"]?.Split(',');
        var origins = configOrigins is { Length: > 0 }
            ? configOrigins
            : ["http://localhost:3000", "http://localhost:3001"];
        policy.WithOrigins(origins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    }));

    // ── Rate Limiting ─────────────────────────────────────────────────────────
    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

        // Portrait generation: max 5 per IP per minute
        options.AddFixedWindowLimiter("portraits", cfg =>
        {
            cfg.PermitLimit         = 5;
            cfg.Window              = TimeSpan.FromMinutes(1);
            cfg.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
            cfg.QueueLimit          = 0;
        });

        // Checkout: max 10 per IP per minute
        options.AddFixedWindowLimiter("checkout", cfg =>
        {
            cfg.PermitLimit         = 10;
            cfg.Window              = TimeSpan.FromMinutes(1);
            cfg.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
            cfg.QueueLimit          = 0;
        });

        // General API: 120 requests per minute per IP
        options.AddFixedWindowLimiter("global", cfg =>
        {
            cfg.PermitLimit         = 120;
            cfg.Window              = TimeSpan.FromMinutes(1);
            cfg.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
            cfg.QueueLimit          = 2;
        });
    });

    // ── Health checks ─────────────────────────────────────────────────────────
    builder.Services.AddHealthChecks()
        .AddDbContextCheck<ApplicationDbContext>("database");

    var app = builder.Build();

    // ── Ensure MinIO bucket exists ────────────────────────────────────────────
    try
    {
        var s3     = app.Services.GetRequiredService<IAmazonS3>();
        var bucket = app.Configuration["S3_BUCKET"] ?? app.Configuration["MINIO_BUCKET"] ?? "tolif";
        var exists = await AmazonS3Util.DoesS3BucketExistV2Async(s3, bucket);
        if (!exists)
        {
            await s3.PutBucketAsync(new PutBucketRequest { BucketName = bucket, UseClientRegion = true });
            Log.Information("MinIO bucket '{Bucket}' created", bucket);
        }
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "Could not ensure MinIO bucket exists — will retry on next request");
    }

    // ── Seed database ─────────────────────────────────────────────────────────
    using (var scope = app.Services.CreateScope())
    {
        var db          = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AdminUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var config      = scope.ServiceProvider.GetRequiredService<IConfiguration>();

        await DbSeeder.SeedAsync(
            db, userManager, roleManager,
            config["ADMIN_EMAIL"] ?? "admin@tolif.com",
            config["ADMIN_PASSWORD"] ?? "Admin@12345!");
    }

    // ── Register Hangfire recurring jobs (use DI manager, not static API) ────
    using (var scope = app.Services.CreateScope())
    {
        var recurringJobs = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();

        recurringJobs.AddOrUpdate<DeleteExpiredPhotosJob>(
            "delete-expired-photos",
            j => j.ExecuteAsync(CancellationToken.None),
            Cron.Daily(hour: 3));   // 03:00 UTC nightly

        recurringJobs.AddOrUpdate<CleanupOrphanedUploadsJob>(
            "cleanup-orphaned-uploads",
            j => j.ExecuteAsync(CancellationToken.None),
            Cron.Daily(hour: 4));   // 04:00 UTC nightly
    }

    // ── Middleware ────────────────────────────────────────────────────────────
    app.UseSerilogRequestLogging();

    // Security headers
    app.Use(async (ctx, next) =>
    {
        ctx.Response.Headers["X-Content-Type-Options"]    = "nosniff";
        ctx.Response.Headers["X-Frame-Options"]           = "DENY";
        ctx.Response.Headers["X-XSS-Protection"]          = "1; mode=block";
        ctx.Response.Headers["Referrer-Policy"]           = "strict-origin-when-cross-origin";
        ctx.Response.Headers["Permissions-Policy"]        = "camera=(), microphone=(), geolocation=()";
        await next();
    });

    app.UseCors("Frontend");
    app.UseRateLimiter();

    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    app.UseAuthentication();
    app.UseAuthorization();

    app.MapControllers();
    app.MapHangfireDashboard("/hangfire");
    app.MapHealthChecks("/health/live");
    app.MapHealthChecks("/health/ready");

    await app.RunAsync();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
