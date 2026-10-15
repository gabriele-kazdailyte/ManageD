using ManageD.Api.Dtos;
using ManageD.Api.Models;

namespace ManageD.Api.Services;

public interface IAssetStore
{
    Task<AssetSnapshot> AddAsync(Asset asset, CancellationToken cancellationToken);
    Task<IReadOnlyList<AssetSummary>> ListByWorkspaceAsync(Guid workspaceId, CancellationToken cancellationToken);
    Task<AssetSnapshot?> GetAsync(Guid id, CancellationToken cancellationToken);
    Task<bool> RemoveAsync(Guid id, CancellationToken cancellationToken);
}