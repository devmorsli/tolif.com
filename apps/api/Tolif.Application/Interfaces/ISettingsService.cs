namespace Tolif.Application.Interfaces;

public interface ISettingsService
{
    Task<string?> GetAsync(string key, CancellationToken ct = default);
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default) where T : struct;
    Task SetAsync(string key, string value, bool isSensitive = false, CancellationToken ct = default);
    Task<Dictionary<string, string?>> GetAllAsync(CancellationToken ct = default);
}
