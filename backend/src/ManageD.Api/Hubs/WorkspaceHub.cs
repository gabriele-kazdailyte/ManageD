using ManageD.Api.Common;
using ManageD.Api.Dtos;
using ManageD.Api.Models;
using ManageD.Api.Services;
using Microsoft.AspNetCore.SignalR;

namespace ManageD.Api.Hubs;

public class WorkspaceHub : Hub
{
    private readonly IWorkspaceService _workspaceService;
    private readonly IUserService _userService;
    private readonly IAssetService _assetService;
    private readonly IPresenceService _presenceService;
    private readonly IAssetLocks _locks;
    private readonly PresetCatalog _presets;

    public WorkspaceHub(
        IWorkspaceService workspaceService,
        IUserService userService,
        IAssetService assetService,
        IPresenceService presenceService,
        IAssetLocks locks,
        PresetCatalog presets)
    {
        _workspaceService = workspaceService;
        _userService = userService;
        _assetService = assetService;
        _presenceService = presenceService;
        _locks = locks;
        _presets = presets;
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

    public async Task CreateAsset(Guid workspaceId, string title, TemplateType? templateType, string? presetName)
    {
        EnsureJoined(workspaceId);

        if (string.IsNullOrWhiteSpace(title))
        {
            throw new InvalidRequestException("Title can't be empty.");
        }

        if (title.Trim().Length > DeltaApplier.MaxTitleLength)
        {
            throw new InvalidRequestException($"Title can't be longer than {DeltaApplier.MaxTitleLength} characters.");
        }

        IReadOnlyList<string>? initialItems = null;
        if (presetName is not null)
        {
            var preset = await _presets.FindAsync(presetName, Context.ConnectionAborted)
                ?? throw new UnknownPresetException(presetName);
            initialItems = preset.ItemTexts;
        }

        var asset = await _assetService.CreateAsync(
            title,
            workspaceId,
            templateType ?? TemplateType.Todo,
            initialItems,
            Context.ConnectionAborted)
            ?? throw new WorkspaceNotFoundException(workspaceId);

        await Clients.Group(GroupName(workspaceId)).SendAsync("AssetCreated", new AssetCreatedEvent(asset));
    }

    public async Task UpdateAsset(Guid assetId, AssetDelta delta)
    {
        var workspaceId = await _assetService.GetWorkspaceIdAsync(assetId, Context.ConnectionAborted)
            ?? throw new AssetNotFoundException(assetId);
        EnsureJoined(workspaceId);

        await _locks.RunAsync(assetId, async () =>
        {
            // Not cancellable once started: a half-finished save-and-broadcast would leave clients out of sync
            var applied = await _assetService.ApplyDeltaAsync(assetId, delta, CancellationToken.None);

            if (!applied.IsEmpty)
            {
                await Clients.Group(GroupName(workspaceId)).SendAsync("AssetUpdated", new AssetUpdatedEvent(assetId, applied));
            }
        }, Context.ConnectionAborted);
    }

    public async Task DeleteAsset(Guid assetId)
    {
        var workspaceId = await _assetService.GetWorkspaceIdAsync(assetId, Context.ConnectionAborted)
            ?? throw new AssetNotFoundException(assetId);
        EnsureJoined(workspaceId);

        await _locks.RunAndForgetAsync(assetId, async () =>
        {
            // The existence check is inside the lock: if a concurrent delete won, this one finds nothing
            if (!await _assetService.DeleteAsync(assetId, CancellationToken.None))
            {
                throw new AssetNotFoundException(assetId);
            }

            await Clients.Group(GroupName(workspaceId)).SendAsync("AssetDeleted", new AssetDeletedEvent(assetId));
        }, Context.ConnectionAborted);
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

    private void EnsureJoined(Guid workspaceId)
    {
        if (!_presenceService.HasJoined(Context.ConnectionId, workspaceId))
        {
            throw new HubException("You have not joined this workspace.");
        }
    }

    private static string GroupName(Guid workspaceId)
    {
        return $"workspace-{workspaceId}";
    }
}
