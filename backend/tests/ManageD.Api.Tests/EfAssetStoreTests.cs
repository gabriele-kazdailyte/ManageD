using ManageD.Api.Common;
using ManageD.Api.Dtos;
using ManageD.Api.Models;
using ManageD.Api.Services;

namespace ManageD.Api.Tests;

public class EfAssetStoreTests : IDisposable
{
    private readonly SqliteTestDb _db = new();

    public void Dispose() => _db.Dispose();

    private async Task<Guid> SeedAssetAsync(params string[] itemTexts)
    {
        await using var context = _db.CreateContext();
        var workspace = new Workspace { Id = Guid.NewGuid(), Name = "w", CreatedAt = DateTime.UtcNow };
        var asset = new Asset
        {
            Id = Guid.NewGuid(),
            Title = "a",
            WorkspaceId = workspace.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Items = itemTexts
                .Select((text, index) => new TodoItem { Id = Guid.NewGuid(), Text = text, Order = index })
                .ToList(),
        };
        context.Workspaces.Add(workspace);
        context.Assets.Add(asset);
        await context.SaveChangesAsync();
        return asset.Id;
    }

    [Fact]
    public async Task Added_item_is_inserted_not_updated()
    {
        var assetId = await SeedAssetAsync("first");
        await using var context = _db.CreateContext();
        var store = new EfAssetStore(context);

        var asset = await store.GetForUpdateAsync(assetId, CancellationToken.None);
        DeltaApplier.Apply(asset!, new AssetDelta([new TodoItemDto(Guid.NewGuid(), "second", false, 1)], null, null));
        await store.SaveAsync(asset!, CancellationToken.None);

        await using var verify = _db.CreateContext();
        var saved = await new EfAssetStore(verify).GetAsync(assetId, CancellationToken.None);
        Assert.Equal(2, saved!.Items.Count);
    }

    [Fact]
    public async Task Deadline_and_completion_date_are_persisted_and_returned_in_snapshots()
    {
        var assetId = await SeedAssetAsync("task");
        var deadline = new DateOnly(2026, 11, 12);
        var completedDate = DateOnly.FromDateTime(DateTime.UtcNow);

        await using (var context = _db.CreateContext())
        {
            var store = new EfAssetStore(context);
            var asset = await store.GetForUpdateAsync(assetId, CancellationToken.None);
            DeltaApplier.Apply(
                asset!,
                new AssetDelta(null, [new TodoItemChange(asset!.Items.Single().Id, null, true, null, deadline)], null));
            await store.SaveAsync(asset, CancellationToken.None);
        }

        await using var verify = _db.CreateContext();
        var saved = await new EfAssetStore(verify).GetAsync(assetId, CancellationToken.None);
        var item = Assert.Single(saved!.Items);
        Assert.Equal(deadline, item.DeadlineDate);
        Assert.Equal(completedDate, item.CompletedDate);
    }

    [Fact]
    public async Task Editing_an_item_deleted_by_someone_else_throws_ConcurrencyConflict()
    {
        var assetId = await SeedAssetAsync("only");

        await using var mine = _db.CreateContext();
        var myStore = new EfAssetStore(mine);
        var myAsset = await myStore.GetForUpdateAsync(assetId, CancellationToken.None);
        var itemId = myAsset!.Items.Single().Id;

        // Someone else deletes the item after I loaded it.
        await using (var theirs = _db.CreateContext())
        {
            var theirStore = new EfAssetStore(theirs);
            var theirAsset = await theirStore.GetForUpdateAsync(assetId, CancellationToken.None);
            DeltaApplier.Apply(theirAsset!, new AssetDelta(null, null, [itemId]));
            await theirStore.SaveAsync(theirAsset!, CancellationToken.None);
        }

        DeltaApplier.Apply(myAsset, new AssetDelta(null, [new TodoItemChange(itemId, "edited", null, null)], null));

        await Assert.ThrowsAsync<ConcurrencyConflictException>(() => myStore.SaveAsync(myAsset, CancellationToken.None));
    }

    [Fact]
    public async Task GetWorkspaceId_returns_the_owning_workspace_or_null()
    {
        var assetId = await SeedAssetAsync("x");
        await using var context = _db.CreateContext();
        var store = new EfAssetStore(context);

        var workspaceId = await store.GetWorkspaceIdAsync(assetId, CancellationToken.None);
        var missing = await store.GetWorkspaceIdAsync(Guid.NewGuid(), CancellationToken.None);

        Assert.NotNull(workspaceId);
        Assert.Null(missing);
    }
}
