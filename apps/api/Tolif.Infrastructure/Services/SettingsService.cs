using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Tolif.Application.Interfaces;
using Tolif.Domain.Entities;
using Tolif.Infrastructure.Persistence;

namespace Tolif.Infrastructure.Services;

public class SettingsService(ApplicationDbContext db, IDataProtectionProvider dpProvider) : ISettingsService
{
    private readonly IDataProtector _protector = dpProvider.CreateProtector("Tolif.Settings");

    public async Task<string?> GetAsync(string key, CancellationToken ct = default)
    {
        var setting = await db.Settings.FirstOrDefaultAsync(s => s.Key == key, ct);
        if (setting is null) return null;

        return setting.IsSensitive ? _protector.Unprotect(setting.Value) : setting.Value;
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default) where T : struct
    {
        var raw = await GetAsync(key, ct);
        if (raw is null) return null;
        try { return (T)Convert.ChangeType(raw, typeof(T)); }
        catch { return null; }
    }

    public async Task SetAsync(string key, string value, bool isSensitive = false, CancellationToken ct = default)
    {
        var setting = await db.Settings.FirstOrDefaultAsync(s => s.Key == key, ct);
        var storedValue = isSensitive ? _protector.Protect(value) : value;

        if (setting is null)
        {
            db.Settings.Add(new Setting
            {
                Key         = key,
                Value       = storedValue,
                IsSensitive = isSensitive
            });
        }
        else
        {
            setting.Value       = storedValue;
            setting.IsSensitive = isSensitive;
            setting.UpdatedAt   = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
    }

    public async Task<Dictionary<string, string?>> GetAllAsync(CancellationToken ct = default)
    {
        var settings = await db.Settings.ToListAsync(ct);
        return settings.ToDictionary(
            s => s.Key,
            s =>
            {
                try { return s.IsSensitive ? _protector.Unprotect(s.Value) : s.Value; }
                catch { return null; }
            });
    }
}
