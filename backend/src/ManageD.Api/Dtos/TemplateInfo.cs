using namespace ManageD.Api.Dtos;

public readonly struct TemplateInfo(string name, int itemCount)
{
    public string Name { get; } = name;
    public int itemCount { get; } = itemCount;
    public bool IsEmpty => ItemCount == 0;
}
