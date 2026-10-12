using ManageD.Api.Data;
using ManageD.Api.Dtos;
using ManageD.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ManageD.Api.Services;

public class AssetService
{
    private readonly ManageDDbContext _dbContext;
    private readonly InMemoryAssetStore _store;

    public AssetService(ManageDDbContext dbContext, InMemoryAssetStore store)
    {
        _dbContext = dbContext;
        _store = store;
    }

    // Returns null when the workspace doesn't exist.
    public async Task<AssetSnapshot?> CreateAsync(
        string title,
        Guid workspaceId,
        TemplateType templateType = TemplateType.Todo,
        CancellationToken cancellationToken = default)
    {
        if (!await WorkspaceExistsAsync(workspaceId, cancellationToken))
        {
            return null;
        }

        var now = DateTime.UtcNow;
        var asset = new Asset
        {
            Id = Guid.NewGuid(),
            Title = title.Trim(),
            TemplateType = templateType,
            WorkspaceId = workspaceId,
            CreatedAt = now,
            UpdatedAt = now,

            // Each template sets up its own empty content, so a new enum value fails loudly here
            // until its setup is written instead of quietly producing a broken asset.
            Items = templateType switch
            {
                TemplateType.Todo => new List<TodoItem>(),
                _ => throw new NotSupportedException($"Template type '{templateType}' is not supported yet."),
            },
        };

        return _store.Add(asset);
    }

    // Returns null when the workspace doesn't exist, so callers can tell it apart from an empty workspace.
    public async Task<IReadOnlyList<AssetSummary>?> ListAsync(Guid workspaceId, CancellationToken cancellationToken)
    {
        if (!await WorkspaceExistsAsync(workspaceId, cancellationToken))
        {
            return null;
        }

        return _store.ListByWorkspace(workspaceId);
    }

    public AssetSnapshot? Get(Guid id)
    {
        return _store.Get(id);
    }

    public bool Delete(Guid id)
    {
        return _store.Remove(id);
    }

    private Task<bool> WorkspaceExistsAsync(Guid workspaceId, CancellationToken cancellationToken)
    {
        return _dbContext.Workspaces.AnyAsync(workspace => workspace.Id == workspaceId, cancellationToken);
    }
}
