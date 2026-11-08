using ManageD.Api.Common;
using ManageD.Api.Dtos;

namespace ManageD.Api.Services;

public interface IWorkspaceService
{
    Task<Result<WorkspaceSummary>> CreateAsync(string name, Guid creatorUserId, CancellationToken cancellationToken);

    Task<Result<IReadOnlyList<WorkspaceSummary>>> ListForUserAsync(Guid userId, CancellationToken cancellationToken);

    Task<Result<IReadOnlyList<MemberSummary>>> ListMembersAsync(
        Guid workspaceId,
        Guid? excludeUserId = null,
        CancellationToken cancellationToken = default);

    Task<Result<MemberSummary>> AddMemberAsync(
        Guid workspaceId,
        Guid userId,
        CancellationToken cancellationToken);

    Task<bool> DeleteAsync(Guid workspaceId, CancellationToken cancellationToken);

    Task<bool> IsMemberAsync(Guid workspaceId, Guid userId, CancellationToken cancellationToken);
}