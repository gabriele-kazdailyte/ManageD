using System.Text.Json.Serialization;

namespace ManageD.Api.Dtos;

public record AssetDelta(
    IReadOnlyList<TodoItemDto>? Added,
    IReadOnlyList<TodoItemChange>? Updated,
    IReadOnlyList<Guid>? Deleted,
    string? Title = null,
    float? X = null,
    float? Y = null)
{
    [JsonIgnore]
    public bool IsEmpty =>
        (Added?.Count ?? 0) == 0 &&
        (Updated?.Count ?? 0) == 0 &&
        (Deleted?.Count ?? 0) == 0 &&
        Title is null &&
        X is null &&
        Y is null;
}
