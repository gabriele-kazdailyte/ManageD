namespace ManageD.Api.Models;

public record TodoTemplate(string Name, IReadOnlyList<string> ItemTexts);
