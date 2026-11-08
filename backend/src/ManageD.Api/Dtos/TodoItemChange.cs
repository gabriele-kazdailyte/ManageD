namespace ManageD.Api.Dtos;

/// <summary>A partial edit of one item. Null implies to leave the field alone.</summary>
public record TodoItemChange(Guid Id, string? Text, bool? IsDone, int? Order);
