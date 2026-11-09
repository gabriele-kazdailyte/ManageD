using ManageD.Api.Common;
using ManageD.Api.Data;
using ManageD.Api.Dtos;
using ManageD.Api.Models;
using Microsoft.EntityFrameworkCore;

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
            asset.Items.ToOrderedDtos(),
            asset.NoteContent);
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

    public async Task<AssetSnapshot?> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var asset = await _dbContext.Assets
            .Include(a => a.Items)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (asset == null)
        {
            return null;
        }

        return ToSnapshot(asset);
    }

    public async Task<IReadOnlyList<AssetSummary>> ListByWorkspaceAsync(Guid workspaceId, CancellationToken cancellationToken)
    {
        var assets = await _dbContext.Assets
            .Where(a => a.WorkspaceId == workspaceId)
            .Include(a => a.Items)
            .OrderBy(a => a.CreatedAt)
            .ToListAsync(cancellationToken);

        return assets
            .Select(a => new AssetSummary(
                a.Id,
                a.Title,
                a.TemplateType,
                a.UpdatedAt,
                a.Items.Count))
            .ToList();
    }

    public async Task<IReadOnlyList<AssetSnapshot>> GetWorkspaceAssetsAsync(Guid workspaceId, CancellationToken cancellationToken)
    {
        var assets = await _dbContext.Assets
            .AsNoTracking()
            .Where(a => a.WorkspaceId == workspaceId)
            .Include(a => a.Items)
            .OrderBy(a => a.CreatedAt)
            .ToListAsync(cancellationToken);

        return assets.Select(ToSnapshot).ToList();
    }

    public Task<Asset?> GetForUpdateAsync(Guid id, CancellationToken cancellationToken)
    {
        return _dbContext.Assets
            .Include(a => a.Items)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
    }

    public async Task SaveAsync(Asset asset, CancellationToken cancellationToken)
    {
        asset.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            _dbContext.ChangeTracker.Clear();
            throw new ConcurrencyConflictException();
        }
    }

    public Task<Guid?> GetWorkspaceIdAsync(Guid assetId, CancellationToken cancellationToken)
    {
        return _dbContext.Assets
            .AsNoTracking()
            .Where(a => a.Id == assetId)
            .Select(a => (Guid?)a.WorkspaceId)
            .FirstOrDefaultAsync(cancellationToken);
    }
}
