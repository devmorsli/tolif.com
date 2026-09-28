using Microsoft.AspNetCore.Identity;

namespace Tolif.Infrastructure.Persistence;

public class AdminUser : IdentityUser
{
    public string? DisplayName { get; set; }
    public string Role { get; set; } = "Staff";   // "Admin" or "Staff"
}
