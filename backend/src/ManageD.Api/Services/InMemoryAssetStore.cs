using ManageD.Api.Dtos;
using ManageD.Api.Models;

namespace ManageD.Api.Services;

// Temporary storage until assets are persisted with EF Core. Registered as a singleton so every
// request sees the same assets; every access takes _lock because requests run concurrently.
public class InMemoryAssetStore
{
    private readonly Dictionary<Guid, Asset> _assets = new();
    private readonly Lock _lock = new();

    public AssetSnapshot Add(Asset asset)
    {
        lock (_lock)
        {
            _assets.Add(asset.Id, asset);
            return ToSnapshot(asset);
        }
    }

    public IReadOnlyList<AssetSummary> ListByWorkspace(Guid workspaceId)
    {
        lock (_lock)
        {
            return _assets.Values
                .Where(asset => asset.WorkspaceId == workspaceId)
                .OrderBy(asset => asset.CreatedAt)
                .Select(asset => new AssetSummary(
                    asset.Id,
                    asset.Title,
                    asset.TemplateType,
                    asset.UpdatedAt,
                    asset.Items.Count))
                .ToList();
        }
    }

    public AssetSnapshot? Get(Guid id)
    {
        lock (_lock)
        {
            return _assets.TryGetValue(id, out var asset) ? ToSnapshot(asset) : null;
        }
    }

    public bool Remove(Guid id)
    {
        lock (_lock)
        {
            return _assets.Remove(id);
        }
    }

    // Callers get an immutable copy, never the stored Asset, so they can't read it while another
    // request is changing it outside the lock.
    private static AssetSnapshot ToSnapshot(Asset asset)
    {
        return new AssetSnapshot(
            asset.Id,
            asset.Title,
            asset.TemplateType,
            asset.Revision,
            asset.Items
                .OrderBy(item => item.Order)
                .Select(item => new TodoItemDto(item.Id, item.Text, item.IsDone, item.Order))
                .ToList());
    }
}
