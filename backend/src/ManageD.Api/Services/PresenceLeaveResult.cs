namespace ManageD.Api.Services;

public record PresenceLeaveResult(Guid WorkspaceId, Guid UserId, bool WasLastConnectionForUser);
