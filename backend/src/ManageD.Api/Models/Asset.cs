using System.ComponentModel.DataAnnotations;

namespace ManageD.Api.Models;

public class Asset
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public TemplateType TemplateType { get; set; } = TemplateType.Todo;

    [ConcurrencyCheck]
    public int Revision { get; set; }

    public Guid WorkspaceId { get; set; }
    public Workspace? Workspace { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<TodoItem> Items { get; set; } = new();
}