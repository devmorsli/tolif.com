using Hangfire;
using Microsoft.AspNetCore.Identity;
using Serilog;
using Tolif.Infrastructure;
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
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddOpenApi();

    // ── CORS ─────────────────────────────────────────────────────────────────
    builder.Services.AddCors(opts => opts.AddPolicy("Frontend", policy =>
    {
        var origins = builder.Configuration["ALLOWED_ORIGINS"]?.Split(',')
            ?? ["http://localhost:3000"];
        policy.WithOrigins(origins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    }));

    // ── Health checks ─────────────────────────────────────────────────────────
    builder.Services.AddHealthChecks()
        .AddDbContextCheck<ApplicationDbContext>("database");

    var app = builder.Build();

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

    // ── Middleware ────────────────────────────────────────────────────────────
    app.UseSerilogRequestLogging();
    app.UseCors("Frontend");

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
