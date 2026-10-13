using ManageD.Api.Models;

namespace ManageD.Api.Dtos;

// A full asset as returned by POST /api/assets and GET /api/assets/{id}.
public record AssetSnapshot(
    Guid Id,
    string Title,
    TemplateType TemplateType,
    int Revision,
    IReadOnlyList<TodoItemDto> Items);
