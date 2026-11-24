using ManageD.Api.Dtos;
using ManageD.Api.Models;

namespace ManageD.Api.Services;

public interface IPresetCatalog
{
    Task<List<PresetInfo>> GetInfosAsync(CancellationToken cancellationToken);

    Task<TodoPreset?> FindAsync(string name, CancellationToken cancellationToken);
}
