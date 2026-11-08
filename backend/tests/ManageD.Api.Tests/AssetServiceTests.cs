using ManageD.Api.Common;
using ManageD.Api.Data;
using ManageD.Api.Dtos;
using ManageD.Api.Models;
using ManageD.Api.Services;

namespace ManageD.Api.Tests;

public class AssetServiceTests : IDisposable
{
    private readonly SqliteTestDb _db = new();

    public void Dispose() => _db.Dispose();

    private sealed class FlakyStore : IAssetStore
    {
        private readonly IAssetStore _inner;
        private readonly ManageDDbContext _context;
        private int _failuresLeft;

        public FlakyStore(IAssetStore inner, ManageDDbContext context, int failures)
        {
            _inner = inner;
            _context = context;
            _failuresLeft = failures;
        }

        public int SaveCalls { get; private set; }

        public Task<AssetSnapshot> AddAsync(Asset asset, CancellationToken ct) => _inner.AddAsync(asset, ct);
        public Task<IReadOnlyList<AssetSummary>> ListByWorkspaceAsync(Guid id, CancellationToken ct) => _inner.ListByWorkspaceAsync(id, ct);
        public Task<IReadOnlyList<AssetSnapshot>> GetWorkspaceAssetsAsync(Guid id, CancellationToken ct) => _inner.GetWorkspaceAssetsAsync(id, ct);
        public Task<AssetSnapshot?> GetAsync(Guid id, CancellationToken ct) => _inner.GetAsync(id, ct);
        public Task<bool> RemoveAsync(Guid id, CancellationToken ct) => _inner.RemoveAsync(id, ct);
        public Task<Asset?> GetForUpdateAsync(Guid id, CancellationToken ct) => _inner.GetForUpdateAsync(id, ct);

        public Task SaveAsync(Asset asset, CancellationToken ct)
        {
            SaveCalls++;
            if (_failuresLeft-- > 0)
            {
                // Same as the real store: drop the stale tracked copy before reporting the conflict.
                _context.ChangeTracker.Clear();
                throw new ConcurrencyConflictException();
            }

            return _inner.SaveAsync(asset, ct);
        }
    }

    private async Task<(AssetService Service, FlakyStore Store, Guid AssetId)> ArrangeAsync(int failures)
    {
        var context = _db.CreateContext();
        var workspace = new Workspace { Id = Guid.NewGuid(), Name = "w", CreatedAt = DateTime.UtcNow };
        context.Workspaces.Add(workspace);
        await context.SaveChangesAsync();

        var store = new FlakyStore(new EfAssetStore(context), context, failures);
        var service = new AssetService(context, store);
        var created = await service.CreateAsync("t", workspace.Id, cancellationToken: CancellationToken.None);
        return (service, store, created!.Id);
    }

    [Fact]
    public async Task Retries_once_after_a_conflict_and_succeeds()
    {
        var (service, store, assetId) = await ArrangeAsync(failures: 1);
        var delta = new AssetDelta([new TodoItemDto(Guid.NewGuid(), "x", false, 0)], null, null);

        var applied = await service.ApplyDeltaAsync(assetId, delta, CancellationToken.None);

        Assert.Single(applied.Added!);
        Assert.Equal(2, store.SaveCalls);
    }

    [Fact]
    public async Task Gives_up_after_the_second_conflict()
    {
        var (service, _, assetId) = await ArrangeAsync(failures: 2);
        var delta = new AssetDelta([new TodoItemDto(Guid.NewGuid(), "x", false, 0)], null, null);

        await Assert.ThrowsAsync<ConcurrencyConflictException>(() =>
            service.ApplyDeltaAsync(assetId, delta, CancellationToken.None));
    }

    [Fact]
    public async Task Unknown_asset_throws_AssetNotFound()
    {
        var (service, _, _) = await ArrangeAsync(failures: 0);

        await Assert.ThrowsAsync<AssetNotFoundException>(() =>
            service.ApplyDeltaAsync(Guid.NewGuid(), new AssetDelta(null, null, null), CancellationToken.None));
    }
}