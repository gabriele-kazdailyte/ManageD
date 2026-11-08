using ManageD.Api.Common;
using ManageD.Api.Dtos;
using ManageD.Api.Models;

namespace ManageD.Api.Services;

public interface IAssetStore
{
    Task<AssetSnapshot> AddAsync(Asset asset, CancellationToken cancellationToken);
    Task<IReadOnlyList<AssetSummary>> ListByWorkspaceAsync(Guid workspaceId, CancellationToken cancellationToken);
    Task<AssetSnapshot?> GetAsync(Guid id, CancellationToken cancellationToken);
    Task<bool> RemoveAsync(Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyList<AssetSnapshot>> GetWorkspaceAssetsAsync(Guid workspaceId, CancellationToken cancellationToken);

    /// <summary>Loads the asset with its items, tracked, for modification. Null if it does not exist</summary>
    Task<Asset?> GetForUpdateAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Saves the changes made to an asset loaded with GetForUpdateAsync</summary>
    /// <exception cref="ConcurrencyConflictException">The row changed since it was loaded</exception>
    Task SaveAsync(Asset asset, CancellationToken cancellationToken);

    Task<Guid?> GetWorkspaceIdAsync(Guid assetId, CancellationToken cancellationToken);
}
