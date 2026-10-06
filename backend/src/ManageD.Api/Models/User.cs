namespace ManageD.Api.Models;

public class User
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public ICollection<Workspace> Workspaces { get; set; } = new List<Workspace>();
}
