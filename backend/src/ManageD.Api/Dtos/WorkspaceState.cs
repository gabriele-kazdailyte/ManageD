namespace ManageD.Api.Dtos;

// What JoinWorkspace returns to the caller only.
public record WorkspaceState(IReadOnlyList<AssetSnapshot> Assets, IReadOnlyList<ViewerSummary> Viewers);
