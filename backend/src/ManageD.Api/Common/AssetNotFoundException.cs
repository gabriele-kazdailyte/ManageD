namespace ManageD.Api.Common;

public sealed class AssetNotFoundException : DomainException
{
    public AssetNotFoundException(Guid assetId)
        : base($"Asset {assetId} was not found.")
    {
        AssetId = assetId;
    }

    public Guid AssetId { get; }
}
