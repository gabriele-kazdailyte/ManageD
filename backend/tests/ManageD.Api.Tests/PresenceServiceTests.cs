using ManageD.Api.Services;

namespace ManageD.Api.Tests;

public class PresenceServiceTests
{
    private static readonly Guid WorkspaceId = Guid.NewGuid();
    private static readonly Guid AliceId = Guid.NewGuid();
    private static readonly Guid BobId = Guid.NewGuid();

    [Fact]
    public async Task First_connection_of_a_user_is_flagged_as_first()
    {
        var presence = new PresenceService();

        var join = await presence.JoinAsync("c1", WorkspaceId, AliceId, "Alice");

        Assert.True(join.IsFirstConnectionForUser);
        Assert.Single(join.Viewers);
    }

    [Fact]
    public async Task Second_tab_of_the_same_user_is_not_first_and_is_listed_once()
    {
        var presence = new PresenceService();
        await presence.JoinAsync("c1", WorkspaceId, AliceId, "Alice");

        var join = await presence.JoinAsync("c2", WorkspaceId, AliceId, "Alice");

        Assert.False(join.IsFirstConnectionForUser);
        Assert.Single(join.Viewers);
    }

    [Fact]
    public async Task Viewers_are_sorted_by_display_name()
    {
        var presence = new PresenceService();
        await presence.JoinAsync("c1", WorkspaceId, BobId, "Bob");

        var join = await presence.JoinAsync("c2", WorkspaceId, AliceId, "Alice");

        Assert.Equal(["Alice", "Bob"], join.Viewers.Select(viewer => viewer.DisplayName));
    }

    [Fact]
    public async Task Leaving_one_of_two_tabs_is_not_the_last_connection()
    {
        var presence = new PresenceService();
        await presence.JoinAsync("c1", WorkspaceId, AliceId, "Alice");
        await presence.JoinAsync("c2", WorkspaceId, AliceId, "Alice");

        var left = await presence.LeaveAsync("c1", WorkspaceId);

        Assert.NotNull(left);
        Assert.False(left.WasLastConnectionForUser);
    }

    [Fact]
    public async Task Leaving_the_only_tab_is_the_last_connection()
    {
        var presence = new PresenceService();
        await presence.JoinAsync("c1", WorkspaceId, AliceId, "Alice");

        var left = await presence.LeaveAsync("c1", WorkspaceId);

        Assert.NotNull(left);
        Assert.True(left.WasLastConnectionForUser);
        Assert.Equal(AliceId, left.UserId);
    }

    [Fact]
    public async Task Leaving_a_workspace_that_was_never_joined_returns_null()
    {
        var presence = new PresenceService();

        Assert.Null(await presence.LeaveAsync("c1", WorkspaceId));
    }

    [Fact]
    public async Task HasJoined_is_true_only_after_joining_and_before_leaving()
    {
        var presence = new PresenceService();
        Assert.False(presence.HasJoined("c1", WorkspaceId));

        await presence.JoinAsync("c1", WorkspaceId, AliceId, "Alice");
        Assert.True(presence.HasJoined("c1", WorkspaceId));

        await presence.LeaveAsync("c1", WorkspaceId);
        Assert.False(presence.HasJoined("c1", WorkspaceId));
    }

    [Fact]
    public async Task LeaveAll_removes_the_connection_from_every_workspace()
    {
        var presence = new PresenceService();
        var otherWorkspaceId = Guid.NewGuid();
        await presence.JoinAsync("c1", WorkspaceId, AliceId, "Alice");
        await presence.JoinAsync("c1", otherWorkspaceId, AliceId, "Alice");

        var results = await presence.LeaveAllAsync("c1");

        Assert.Equal(2, results.Count);
        Assert.False(presence.HasJoined("c1", WorkspaceId));
        Assert.False(presence.HasJoined("c1", otherWorkspaceId));
    }

    [Fact]
    public async Task Two_tabs_disconnecting_at_the_same_time_report_the_last_one_exactly_once()
    {
        for (var round = 0; round < 200; round++)
        {
            var presence = new PresenceService();
            await presence.JoinAsync("c1", WorkspaceId, AliceId, "Alice");
            await presence.JoinAsync("c2", WorkspaceId, AliceId, "Alice");

            var results = await Task.WhenAll(
                Task.Run(() => presence.LeaveAllAsync("c1")),
                Task.Run(() => presence.LeaveAllAsync("c2")));

            var lastCount = results.SelectMany(r => r).Count(r => r.WasLastConnectionForUser);
            Assert.Equal(1, lastCount);
        }
    }
}
