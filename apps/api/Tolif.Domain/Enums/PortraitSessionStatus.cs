namespace Tolif.Domain.Enums;

public enum PortraitSessionStatus
{
    Created = 0,
    Uploading = 1,
    Generating = 2,
    PreviewReady = 3,
    SafetyRefused = 4,
    Failed = 5,
    GeneratingHighRes = 6,
    Completed = 7
}
