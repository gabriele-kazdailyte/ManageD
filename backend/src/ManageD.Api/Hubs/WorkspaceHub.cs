using ManageD.Api.Dtos;
using ManageD.Api.Services;
using Microsoft.AspNetCore.SignalR;

namespace ManageD.Api.Hubs;

public class WorkspaceHub : Hub
{
    private readonly WorkspaceService _workspaceService;
    private readonly UserService _userService;
    private readonly AssetService _assetService;
    private readonly IPresenceService _presenceService;

    public WorkspaceHub(
        WorkspaceService workspaceService,
        UserService userService,
        AssetService assetService,
        IPresenceService presenceService)
    {
        _workspaceService = workspaceService;
        _userService = userService;
        _assetService = assetService;
        _presenceService = presenceService;
    }

    public async Task<WorkspaceState> JoinWorkspace(Guid workspaceId, Guid userId)
    {
        var cancellationToken = Context.ConnectionAborted;

        if (!await _workspaceService.IsMemberAsync(workspaceId, userId, cancellationToken))
        {
            throw new HubException("You are not a member of this workspace.");
        }

        var user = await _userService.GetAsync(userId, cancellationToken);
        var displayName = user.Value!.DisplayName;

        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(workspaceId), cancellationToken);

        var join = await _presenceService.JoinAsync(Context.ConnectionId, workspaceId, userId, displayName);
        var assets = await _assetService.GetWorkspaceAssetsAsync(workspaceId, cancellationToken);

        if (join.IsFirstConnectionForUser)
        {
            await Clients.Group(GroupName(workspaceId))
                .SendAsync("UserJoined", new ViewerSummary(userId, displayName), cancellationToken);
        }

        return new WorkspaceState(assets, join.Viewers);
    }

    public async Task LeaveWorkspace(Guid workspaceId)
    {
        var left = await _presenceService.LeaveAsync(Context.ConnectionId, workspaceId);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupName(workspaceId));

        if (left is { WasLastConnectionForUser: true })
        {
            await Clients.Group(GroupName(workspaceId)).SendAsync("UserLeft", new UserLeftNotice(left.UserId));
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var leftWorkspaces = await _presenceService.LeaveAllAsync(Context.ConnectionId);

        foreach (var left in leftWorkspaces.Where(result => result.WasLastConnectionForUser))
        {
            await Clients.Group(GroupName(left.WorkspaceId)).SendAsync("UserLeft", new UserLeftNotice(left.UserId));
        }

        await base.OnDisconnectedAsync(exception);
    }

    private static string GroupName(Guid workspaceId)
    {
        return $"workspace-{workspaceId}";
    }
}
