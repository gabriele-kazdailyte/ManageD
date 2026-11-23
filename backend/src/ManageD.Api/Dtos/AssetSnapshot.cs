using ManageD.Api.Models;

namespace ManageD.Api.Dtos;

// A full asset as sent over the hub: in JoinWorkspace and AssetCreated
public record AssetSnapshot(
    Guid Id,
    string Title,
    TemplateType TemplateType,
    float X,
    float Y,
    IReadOnlyList<TodoItemDto> Items,
    string NoteContent,
    float SizeX = 0,
    float SizeY = 0,
    int ZPos = 0);
