using ManageD.Api.Dtos;

namespace ManageD.Api.Services;

public record PresenceJoinResult(bool IsFirstConnectionForUser, IReadOnlyList<ViewerSummary> Viewers);
