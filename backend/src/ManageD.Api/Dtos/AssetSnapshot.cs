using ManageD.Api.Models;

namespace ManageD.Api.Dtos;

// A full asset as sent over the hub: in JoinWorkspace and AssetCreated
public record AssetSnapshot(
    Guid Id,
    string Title,
    TemplateType TemplateType,
    float X,
    float Y,
    IReadOnlyList<TodoItemDto> Items);
