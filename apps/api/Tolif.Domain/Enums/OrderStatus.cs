namespace Tolif.Domain.Enums;

public enum OrderStatus
{
    Pending = 0,
    Paid = 1,
    GeneratingHighRes = 2,
    Ready = 3,
    SubmittedToPrinter = 4,
    Shipped = 5,
    Refunded = 6,
    Cancelled = 7
}
