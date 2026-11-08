using System.Collections.Concurrent;

namespace ManageD.Api.Services;

public sealed class AssetLocks : IAssetLocks
{
    private readonly ConcurrentDictionary<Guid, SemaphoreSlim> _locks = new();

    public Task RunAsync(Guid assetId, Func<Task> action, CancellationToken cancellationToken)
    {
        return RunCoreAsync(assetId, action, forgetAfter: false, cancellationToken);
    }

    public Task RunAndForgetAsync(Guid assetId, Func<Task> action, CancellationToken cancellationToken)
    {
        return RunCoreAsync(assetId, action, forgetAfter: true, cancellationToken);
    }

    private async Task RunCoreAsync(Guid assetId, Func<Task> action, bool forgetAfter, CancellationToken cancellationToken)
    {
        var gate = _locks.GetOrAdd(assetId, _ => new SemaphoreSlim(1, 1));

        await gate.WaitAsync(cancellationToken);
        try
        {
            await action();

            if (forgetAfter)
            {
                _locks.TryRemove(new KeyValuePair<Guid, SemaphoreSlim>(assetId, gate));
            }
        }
        finally
        {
            gate.Release();
        }
    }
}
