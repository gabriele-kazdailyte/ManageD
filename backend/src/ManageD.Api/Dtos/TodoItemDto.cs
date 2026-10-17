namespace ManageD.Api.Dtos;

public record TodoItemDto(Guid Id, string Text, bool IsDone, int Order) : IComparable<TodoItemDto>
{
    public int CompareTo(TodoItemDto? other)
    {
        if (other is null)
        {
            return 1;
        }

        var byOrder = Order.CompareTo(other.Order);

        return byOrder != 0 ? byOrder : Id.CompareTo(other.Id);
    }
}
