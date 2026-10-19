using ManageD.Api.Data;
using ManageD.Api.Dtos;
using ManageD.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ManageD.Api.Services;

public class AssetService
{
    private readonly ManageDDbContext _dbContext;
    private readonly IAssetStore _store;

    public AssetService(ManageDDbContext dbContext, IAssetStore store)
    {
        _dbContext = dbContext;
        _store = store;
    }

    // Returns null when the workspace doesn't exist.
    public async Task<AssetSnapshot?> CreateAsync(
        string title,
        Guid workspaceId,
        TemplateType templateType = TemplateType.Todo,
        IReadOnlyList<string>? initialItems = null, // Only used by TemplateType.Todo
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

            // Each template sets up its own initial content, so a new enum value fails loudly here
            // until its setup is written instead of quietly producing a broken asset.
            Items = templateType switch
            {
                TemplateType.Todo => BuildItems(initialItems),

                // TODO: if a template type is added to the enum before its setup is written, reject it with a 400
                // in request validation instead of reaching this throw (500).
                _ => throw new NotSupportedException($"Template type '{templateType}' is not supported yet."),
            },
        };

        return await _store.AddAsync(asset, cancellationToken);
    }

    // Returns null when the workspace doesn't exist, so callers can tell it apart from an empty workspace.
    public async Task<IReadOnlyList<AssetSummary>?> ListAsync(Guid workspaceId, CancellationToken cancellationToken)
    {
        if (!await WorkspaceExistsAsync(workspaceId, cancellationToken))
        {
            return null;
        }

        return await _store.ListByWorkspaceAsync(workspaceId, cancellationToken);
    }

    public Task<AssetSnapshot?> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        return _store.GetAsync(id, cancellationToken);
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        return _store.RemoveAsync(id, cancellationToken);
    }

    private Task<bool> WorkspaceExistsAsync(Guid workspaceId, CancellationToken cancellationToken)
    {
        return _dbContext.Workspaces.AnyAsync(workspace => workspace.Id == workspaceId, cancellationToken);
    }

    private static List<TodoItem> BuildItems(IReadOnlyList<string>? texts)
    {
        if (texts is null)
        {
            return [];
        }

        var items = new List<TodoItem>();

        for (var i = 0; i < texts.Count; i++)
        {
            items.Add(new TodoItem { Id = Guid.NewGuid(), Text = texts[i], Order = i });
        }

        return items;
    }
}
