using ManageD.Api.Dtos;
using ManageD.Api.Models;

namespace ManageD.Api.Services;

public interface IAssetService
{
    Task<AssetSnapshot> CreateAsync(
        string title,
        Guid workspaceId,
        TemplateType templateType = TemplateType.Todo,
        IReadOnlyList<string>? initialItems = null,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);

    Task<IReadOnlyList<AssetSnapshot>> GetWorkspaceAssetsAsync(Guid workspaceId, CancellationToken cancellationToken);

    Task<AssetDelta> ApplyDeltaAsync(Guid assetId, AssetDelta delta, CancellationToken cancellationToken);

    Task<Guid?> GetWorkspaceIdAsync(Guid assetId, CancellationToken cancellationToken);
}
