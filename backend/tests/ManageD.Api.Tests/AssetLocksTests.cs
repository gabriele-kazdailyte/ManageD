using ManageD.Api.Services;

namespace ManageD.Api.Tests;

public class AssetLocksTests
{
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(5);

    [Fact]
    public async Task Actions_for_the_same_asset_never_overlap()
    {
        var locks = new AssetLocks();
        var assetId = Guid.NewGuid();
        var running = 0;
        var maxRunning = 0;

        async Task Work()
        {
            var current = Interlocked.Increment(ref running);
            if (current > maxRunning)
            {
                maxRunning = current;
            }

            await Task.Delay(20);
            Interlocked.Decrement(ref running);
        }

        var tasks = Enumerable.Range(0, 10)
            .Select(_ => locks.RunAsync(assetId, Work, CancellationToken.None));
        await Task.WhenAll(tasks).WaitAsync(Timeout);

        Assert.Equal(1, maxRunning);
    }

    [Fact]
    public async Task Different_assets_do_not_block_each_other()
    {
        var locks = new AssetLocks();
        var release = new TaskCompletionSource();

        // Holds asset A's lock until released
        var first = locks.RunAsync(Guid.NewGuid(), () => release.Task, CancellationToken.None);

        // Asset B must be able to run meanwhile. If the locks were shared, this would time out
        await locks.RunAsync(
            Guid.NewGuid(),
            () =>
            {
                release.SetResult();
                return Task.CompletedTask;
            },
            CancellationToken.None).WaitAsync(Timeout);

        await first.WaitAsync(Timeout);
    }

    [Fact]
    public async Task Failing_action_releases_the_lock()
    {
        var locks = new AssetLocks();
        var assetId = Guid.NewGuid();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            locks.RunAsync(assetId, () => throw new InvalidOperationException(), CancellationToken.None));

        // Would hang forever if the lock had not been released
        await locks.RunAsync(assetId, () => Task.CompletedTask, CancellationToken.None).WaitAsync(Timeout);
    }

    [Fact]
    public async Task Forgotten_lock_can_be_used_again_by_a_later_caller()
    {
        var locks = new AssetLocks();
        var assetId = Guid.NewGuid();

        await locks.RunAndForgetAsync(assetId, () => Task.CompletedTask, CancellationToken.None);
        await locks.RunAsync(assetId, () => Task.CompletedTask, CancellationToken.None).WaitAsync(Timeout);
    }
}