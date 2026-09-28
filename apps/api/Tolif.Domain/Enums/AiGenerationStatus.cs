namespace Tolif.Domain.Enums;

public enum AiGenerationStatus
{
    Success = 0,
    SafetyRefused = 1,
    ProviderError = 2,
    Timeout = 3
}
