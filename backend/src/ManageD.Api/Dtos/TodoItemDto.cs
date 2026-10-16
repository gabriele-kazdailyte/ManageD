namespace ManageD.Api.Dtos;

public record TodoItemDto(Guid Id, string Text, bool IsDone, int Order) : IComparable<TodoItemDto>
{
    public int CompareTo(TodoItemDto? other)
    {
        if (other is null)
        {
            return 1;
        }

        return Order.CompareTo(other.Order);
    }
}
