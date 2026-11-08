namespace ManageD.Api.Services;

public interface IPresenceService
{
    Task<PresenceJoinResult> JoinAsync(string connectionId, Guid workspaceId, Guid userId, string displayName);

    // Returns null when the connection had not joined that workspace
    Task<PresenceLeaveResult?> LeaveAsync(string connectionId, Guid workspaceId);

    // For disconnects: removes the connection from every workspace it was in
    Task<IReadOnlyList<PresenceLeaveResult>> LeaveAllAsync(string connectionId);

    bool HasJoined(string connectionId, Guid workspaceId);
}
