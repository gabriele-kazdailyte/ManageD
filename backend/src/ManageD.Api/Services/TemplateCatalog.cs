using System.Text.Json;
using ManageD.Api.Models;

namespace ManageD.Api.Services;

public class TemplateCatalog
{
    private const int MaxTextLength = 200;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly string _path;

    public TemplateCatalog(IWebHostEnvironment environment)
    {
        _path = Path.Combine(environment.ContentRootPath, "Data", "todo-templates.json");
    }

    public async Task<List<TodoTemplate>> LoadAsync(CancellationToken cancellationToken)
    {
        await using var stream = File.OpenRead(_path);

        var templates = await JsonSerializer.DeserializeAsync<List<TodoTemplate>>(stream, JsonOptions, cancellationToken);

        return Validate(templates ?? []);
    }

    private static List<TodoTemplate> Validate(List<TodoTemplate> templates)
    {
        var valid = new List<TodoTemplate>();
        var seenNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var template in templates)
        {
            if (string.IsNullOrWhiteSpace(template.Name) || template.ItemTexts is null)
            {
                continue;
            }

            if (template.ItemTexts.Any(text => string.IsNullOrWhiteSpace(text) || text.Length > MaxTextLength))
            {
                continue;
            }

            if (!seenNames.Add(template.Name))
            {
                continue;
            }

            valid.Add(template);
        }

        return valid;
    }
}
