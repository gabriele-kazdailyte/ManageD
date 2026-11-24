namespace ManageD.Api.Models;

public class User
{
    public const int UsernameMinLength = 3;
    public const int UsernameMaxLength = 32;
    public const int DisplayNameMaxLength = 32;

    public static string NormalizeUsername(string username) => username.Trim().ToLowerInvariant();

    public Guid Id { get; set; }

    // The name used to log in, kept with the capitals it was registered with.
    public string Username { get; set; } = string.Empty;

    // Username in lower case. The unique index is on this column, so "Marius" and "marius" can't both exist.
    public string NormalizedUsername { get; set; } = string.Empty;

    // Salted hash from PasswordHasher. The password itself is never stored.
    public string PasswordHash { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public ICollection<Workspace> Workspaces { get; set; } = new List<Workspace>();
}
