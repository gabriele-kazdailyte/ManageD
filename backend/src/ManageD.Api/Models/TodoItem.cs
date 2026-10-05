namespace ManageD.Api.Models;

public class TodoItem
{
    public Guid Id { get; set; }
    public Guid AssetId { get; set; }
    public Asset? Asset { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsDone { get; set; }
    public int Order { get; set; }
}