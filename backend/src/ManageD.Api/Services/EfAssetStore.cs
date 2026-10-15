using ManageD.Api.Data;
using ManageD.Api.Dtos;
using ManageD.Api.Models;

namespace ManageD.Api.Services;

public class EfAssetStore : IAssetStore
{
    private readonly ManageDDbContext _dbContext;

    public EfAssetStore(ManageDDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<AssetSnapshot> AddAsync(Asset asset, CancellationToken cancellationToken)
    {
        _dbContext.Assets.Add(asset);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return ToSnapshot(asset);
    }

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

    public async Task<bool> RemoveAsync(Guid id, CancellationToken cancellationToken)
    {
        var asset = await _dbContext.Assets.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (asset == null)
        {
            return false;
        }

        _dbContext.Assets.Remove(asset);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}