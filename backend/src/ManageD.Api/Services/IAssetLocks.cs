namespace ManageD.Api.Services;

public interface IAssetLocks
{
    // Runs the action while holding this asset's lock. One action per asset at a time
    Task RunAsync(Guid assetId, Func<Task> action, CancellationToken cancellationToken);

    // Same, but afterwards the asset's lock is discarded. Used when the asset was deleted
    Task RunAndForgetAsync(Guid assetId, Func<Task> action, CancellationToken cancellationToken);
}
