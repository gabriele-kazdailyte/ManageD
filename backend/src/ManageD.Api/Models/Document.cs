namespace ManageD.Api.Models;

public class Document
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public TemplateType TemplateType { get; set; } = TemplateType.Todo;
    public int Revision { get; set; }
    public Guid OwnerId { get; set; }
    public User? Owner { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<TodoItem> Items { get; set; } = new();
}