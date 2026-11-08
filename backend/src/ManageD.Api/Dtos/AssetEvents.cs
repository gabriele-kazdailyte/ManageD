namespace ManageD.Api.Dtos;

public record AssetCreatedEvent(AssetSnapshot Asset);

public record AssetUpdatedEvent(Guid AssetId, AssetDelta Delta);

public record AssetDeletedEvent(Guid AssetId);
