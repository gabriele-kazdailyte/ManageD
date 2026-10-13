namespace ManageD.Api.Dtos;

public record TodoItemDto(Guid Id, string Text, bool IsDone, int Order);
