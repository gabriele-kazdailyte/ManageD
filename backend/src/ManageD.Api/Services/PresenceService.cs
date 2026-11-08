using System.Collections.Concurrent;
using ManageD.Api.Dtos;

namespace ManageD.Api.Services;

public class PresenceService : IPresenceService
{
    // One entry per (connection, workspace). A user with two tabs has two connections, therefore, two entries
    private readonly ConcurrentDictionary<(string ConnectionId, Guid WorkspaceId), PresenceEntry> _entries = new();

    // One gate per workspace. A ConcurrentDictionary makes single operations safe, but
    // "remove, then check the user's other connections" is several steps and needs the gate
    private readonly ConcurrentDictionary<Guid, SemaphoreSlim> _gates = new();

    public async Task<PresenceJoinResult> JoinAsync(string connectionId, Guid workspaceId, Guid userId, string displayName)
    {
        var gate = GetGate(workspaceId);
        await gate.WaitAsync();

        try
        {
            var isFirst = !_entries.Any(entry => entry.Key.WorkspaceId == workspaceId && entry.Value.UserId == userId);
            _entries[(connectionId, workspaceId)] = new PresenceEntry(userId, displayName);

            return new PresenceJoinResult(isFirst, ViewersOf(workspaceId));
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task<PresenceLeaveResult?> LeaveAsync(string connectionId, Guid workspaceId)
    {
        var gate = GetGate(workspaceId);
        await gate.WaitAsync();

        try
        {
            if (!_entries.TryRemove((connectionId, workspaceId), out var removed))
            {
                return null;
            }

            var wasLast = !_entries.Any(entry => entry.Key.WorkspaceId == workspaceId && entry.Value.UserId == removed.UserId);

            return new PresenceLeaveResult(workspaceId, removed.UserId, wasLast);
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task<IReadOnlyList<PresenceLeaveResult>> LeaveAllAsync(string connectionId)
    {
        var workspaceIds = _entries.Keys
            .Where(key => key.ConnectionId == connectionId)
            .Select(key => key.WorkspaceId)
            .ToList();

        var results = new List<PresenceLeaveResult>();

        foreach (var workspaceId in workspaceIds)
        {
            var left = await LeaveAsync(connectionId, workspaceId);

            if (left is not null)
            {
                results.Add(left);
            }
        }

        return results;
    }

    public bool HasJoined(string connectionId, Guid workspaceId)
    {
        return _entries.ContainsKey((connectionId, workspaceId));
    }

    private SemaphoreSlim GetGate(Guid workspaceId)
    {
        return _gates.GetOrAdd(workspaceId, _ => new SemaphoreSlim(1, 1));
    }

    // Each user appears once, even with several tabs open
    private List<ViewerSummary> ViewersOf(Guid workspaceId)
    {
        return _entries
            .Where(entry => entry.Key.WorkspaceId == workspaceId)
            .Select(entry => new ViewerSummary(entry.Value.UserId, entry.Value.DisplayName))
            .DistinctBy(viewer => viewer.UserId)
            .OrderBy(viewer => viewer.DisplayName)
            .ToList();
    }

    private sealed record PresenceEntry(Guid UserId, string DisplayName);
}
