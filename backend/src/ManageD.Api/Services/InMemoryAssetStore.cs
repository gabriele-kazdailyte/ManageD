using ManageD.Api.Dtos;
using ManageD.Api.Models;

namespace ManageD.Api.Services;

// In-memory implementation of IAssetStore, used when no database is wanted (for example, in tests)
public class InMemoryAssetStore : IAssetStore
{
    private readonly Dictionary<Guid, Asset> _assets = new();
    private readonly Lock _lock = new();

    public Task<AssetSnapshot> AddAsync(Asset asset, CancellationToken cancellationToken)
    {
        lock (_lock)
        {
            _assets.Add(asset.Id, asset);
            return Task.FromResult(ToSnapshot(asset));
        }
    }

    public Task<IReadOnlyList<AssetSummary>> ListByWorkspaceAsync(Guid workspaceId, CancellationToken cancellationToken)
    {
        lock (_lock)
        {
            return Task.FromResult<IReadOnlyList<AssetSummary>>(_assets.Values
                .Where(asset => asset.WorkspaceId == workspaceId)
                .OrderBy(asset => asset.CreatedAt)
                .Select(asset => new AssetSummary(
                    asset.Id,
                    asset.Title,
                    asset.TemplateType,
                    asset.UpdatedAt,
                    asset.Items.Count))
                .ToList());
        }
    }

    public Task<AssetSnapshot?> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        lock (_lock)
        {
            return Task.FromResult<AssetSnapshot?>(_assets.TryGetValue(id, out var asset) ? ToSnapshot(asset) : null);
        }
    }

    public Task<bool> RemoveAsync(Guid id, CancellationToken cancellationToken)
    {
        lock (_lock)
        {
            return Task.FromResult(_assets.Remove(id));
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
