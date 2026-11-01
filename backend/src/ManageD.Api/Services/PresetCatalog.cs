using System.Text.Json;
using ManageD.Api.Dtos;
using ManageD.Api.Models;

namespace ManageD.Api.Services;

public class PresetCatalog
{
    private const int MaxTextLength = 200;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly string _path;

    public PresetCatalog(IWebHostEnvironment environment)
    {
        _path = Path.Combine(environment.ContentRootPath, "Data", "todo-presets.json");
    }

    public async Task<List<TodoPreset>> LoadAsync(CancellationToken cancellationToken)
    {
        await using var stream = new FileStream(_path, FileMode.Open, FileAccess.Read, FileShare.Read, bufferSize: 4096, useAsync: true);

        var presets = await JsonSerializer.DeserializeAsync<List<TodoPreset>>(stream, JsonOptions, cancellationToken);

        return Validate(presets ?? []);
    }

    private static List<TodoPreset> Validate(List<TodoPreset> presets)
    {
        var valid = new List<TodoPreset>();
        var seenNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var preset in presets)
        {
            if (string.IsNullOrWhiteSpace(preset.Name) || preset.ItemTexts is null)
            {
                continue;
            }

            if (preset.ItemTexts.Any(text => string.IsNullOrWhiteSpace(text) || text.Length > MaxTextLength))
            {
                continue;
            }

            if (!seenNames.Add(preset.Name))
            {
                continue;
            }

            valid.Add(preset);
        }

        return valid;
    }

    public async Task<List<PresetInfo>> GetInfosAsync(CancellationToken cancellationToken)
    {
        var presets = await LoadAsync(cancellationToken);

        return presets
            .Select(t => new PresetInfo(t.Name, t.ItemTexts.Count))
            .Where(info => !info.IsEmpty)
            .ToList();
    }

    public async Task<TodoPreset?> FindAsync(string name, CancellationToken cancellationToken)
    {
        var presets = await LoadAsync(cancellationToken);

        return presets.FirstOrDefault(preset => string.Equals(preset.Name, name, StringComparison.OrdinalIgnoreCase));
    }
}
