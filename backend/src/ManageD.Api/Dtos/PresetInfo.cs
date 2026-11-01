namespace ManageD.Api.Dtos;

public readonly struct PresetInfo(string name, int itemCount)
{
    public string Name { get; } = name;
    public int ItemCount { get; } = itemCount;
    public bool IsEmpty => ItemCount == 0;
}
