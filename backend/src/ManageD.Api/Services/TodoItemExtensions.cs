using ManageD.Api.Dtos;
using ManageD.Api.Models;

namespace ManageD.Api.Services;

public static class TodoItemExtensions
{
    public static List<TodoItemDto> ToOrderedDtos(this IEnumerable<TodoItem> items)
    {
        return items
            .Select(item => new TodoItemDto(item.Id, item.Text, item.IsDone, item.Order))
            .Order()
            .ToList();
    }
}
