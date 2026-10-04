namespace ManageD.Api.Models;

public class TodoItem
{
    public Guid Id { get; set; }
    public Guid DocumentId { get; set; }
    public Document? Document { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsDone { get; set; }
    public int Order { get; set; }
}
