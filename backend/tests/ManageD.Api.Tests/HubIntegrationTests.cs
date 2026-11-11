using System.Net;
using ManageD.Api.Dtos;
using ManageD.Api.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;

namespace ManageD.Api.Tests;

public class HubIntegrationTests : IClassFixture<ManageDFactory>
{
    private readonly ManageDFactory _factory;

    public HubIntegrationTests(ManageDFactory factory)
    {
        _factory = factory;
    }

    private static Task<T> NextEvent<T>(HubConnection connection, string method)
    {
        var received = new TaskCompletionSource<T>(TaskCreationOptions.RunContinuationsAsynchronously);
        connection.On<T>(method, value => received.TrySetResult(value));

        return received.Task.WaitAsync(TimeSpan.FromSeconds(10));
    }

    private async Task<(Guid AliceId, Guid BobId, Guid WorkspaceId)> ArrangeAsync()
    {
        var aliceId = await _factory.CreateUserAsync("Alice");
        var bobId = await _factory.CreateUserAsync("Bob");
        var workspaceId = await _factory.CreateWorkspaceAsync(aliceId);
        await _factory.AddMemberAsync(workspaceId, bobId);

        return (aliceId, bobId, workspaceId);
    }

    [Fact]
    public async Task Join_create_update_delete_and_leave_are_seen_by_the_other_viewer()
    {
        var (aliceId, bobId, workspaceId) = await ArrangeAsync();
        await using var alice = _factory.CreateHubConnection();
        await using var bob = _factory.CreateHubConnection();
        await alice.StartAsync();
        await bob.StartAsync();

        var aliceState = await alice.InvokeAsync<WorkspaceState>("JoinWorkspace", workspaceId, aliceId);
        Assert.Empty(aliceState.Assets);
        Assert.Single(aliceState.Viewers);

        var bobJoined = NextEvent<ViewerSummary>(alice, "UserJoined");
        var bobState = await bob.InvokeAsync<WorkspaceState>("JoinWorkspace", workspaceId, bobId);
        Assert.Equal(2, bobState.Viewers.Count);
        Assert.Equal(bobId, (await bobJoined).UserId);

        var created = NextEvent<AssetCreatedEvent>(bob, "AssetCreated");
        await alice.InvokeAsync("CreateAsset", workspaceId, "Groceries", TemplateType.Todo, "Daily standup");
        var asset = (await created).Asset;
        Assert.Equal("Groceries", asset.Title);
        Assert.Equal(4, asset.Items.Count);

        var updated = NextEvent<AssetUpdatedEvent>(bob, "AssetUpdated");
        var delta = new AssetDelta(null, [new TodoItemChange(asset.Items[0].Id, null, true, null)], null);
        await alice.InvokeAsync("UpdateAsset", asset.Id, delta);
        var updateEvent = await updated;
        Assert.Equal(asset.Id, updateEvent.AssetId);
        Assert.True(Assert.Single(updateEvent.Delta.Updated!).IsDone);

        var deleted = NextEvent<AssetDeletedEvent>(bob, "AssetDeleted");
        await alice.InvokeAsync("DeleteAsset", asset.Id);
        Assert.Equal(asset.Id, (await deleted).AssetId);

        var bobLeft = NextEvent<UserLeftNotice>(alice, "UserLeft");
        await bob.StopAsync();
        Assert.Equal(bobId, (await bobLeft).UserId);
    }

    [Fact]
    public async Task A_new_viewer_joining_later_gets_the_existing_assets()
    {
        var (aliceId, bobId, workspaceId) = await ArrangeAsync();
        await using var alice = _factory.CreateHubConnection();
        await alice.StartAsync();
        await alice.InvokeAsync<WorkspaceState>("JoinWorkspace", workspaceId, aliceId);
        await alice.InvokeAsync("CreateAsset", workspaceId, "Saved", TemplateType.Todo, (string?)null);

        await using var bob = _factory.CreateHubConnection();
        await bob.StartAsync();
        var state = await bob.InvokeAsync<WorkspaceState>("JoinWorkspace", workspaceId, bobId);

        Assert.Equal("Saved", Assert.Single(state.Assets).Title);
    }

    [Fact]
    public async Task Sticky_note_markdown_is_persisted_and_shared_through_hub_events()
    {
        var (aliceId, bobId, workspaceId) = await ArrangeAsync();
        await using var alice = _factory.CreateHubConnection();
        await using var bob = _factory.CreateHubConnection();
        await alice.StartAsync();
        await bob.StartAsync();
        await alice.InvokeAsync<WorkspaceState>("JoinWorkspace", workspaceId, aliceId);
        await bob.InvokeAsync<WorkspaceState>("JoinWorkspace", workspaceId, bobId);

        var created = NextEvent<AssetCreatedEvent>(bob, "AssetCreated");
        await alice.InvokeAsync("CreateAsset", workspaceId, "Sticky Note", TemplateType.Note, (string?)null);
        var note = (await created).Asset;
        Assert.Equal(TemplateType.Note, note.TemplateType);
        Assert.Empty(note.Items);
        Assert.Empty(note.NoteContent);

        const string markdown = "# Shared note\n\n**Remember this**";
        var updated = NextEvent<AssetUpdatedEvent>(bob, "AssetUpdated");
        await alice.InvokeAsync(
            "UpdateAsset",
            note.Id,
            new AssetDelta(null, null, null, NoteContent: markdown));
        Assert.Equal(markdown, (await updated).Delta.NoteContent);

        var charlieId = await _factory.CreateUserAsync("Charlie");
        await _factory.AddMemberAsync(workspaceId, charlieId);
        await using var charlie = _factory.CreateHubConnection();
        await charlie.StartAsync();
        var state = await charlie.InvokeAsync<WorkspaceState>("JoinWorkspace", workspaceId, charlieId);

        Assert.Equal(markdown, Assert.Single(state.Assets).NoteContent);
    }

    [Fact]
    public async Task A_user_who_is_not_a_member_cannot_join()
    {
        var (_, _, workspaceId) = await ArrangeAsync();
        var strangerId = await _factory.CreateUserAsync("Stranger");
        await using var stranger = _factory.CreateHubConnection();
        await stranger.StartAsync();

        var error = await Assert.ThrowsAsync<HubException>(() =>
            stranger.InvokeAsync<WorkspaceState>("JoinWorkspace", workspaceId, strangerId));

        Assert.Contains("not a member", error.Message);
    }

    [Fact]
    public async Task Creating_an_asset_without_joining_is_rejected()
    {
        var (_, _, workspaceId) = await ArrangeAsync();
        await using var alice = _factory.CreateHubConnection();
        await alice.StartAsync();

        var error = await Assert.ThrowsAsync<HubException>(() =>
            alice.InvokeAsync("CreateAsset", workspaceId, "Nope", TemplateType.Todo, (string?)null));

        Assert.Contains("not joined", error.Message);
    }

    [Fact]
    public async Task Updating_an_unknown_asset_is_rejected()
    {
        await using var alice = _factory.CreateHubConnection();
        await alice.StartAsync();

        var delta = new AssetDelta(null, null, null, "New title");

        await Assert.ThrowsAsync<HubException>(() =>
            alice.InvokeAsync("UpdateAsset", Guid.NewGuid(), delta));
    }

    [Fact]
    public async Task Presets_endpoint_lists_presets_and_the_removed_asset_endpoints_are_gone()
    {
        var client = _factory.CreateClient();

        var presets = await client.GetAsync("/api/assets/presets");
        Assert.Equal(HttpStatusCode.OK, presets.StatusCode);
        Assert.Contains("Daily standup", await presets.Content.ReadAsStringAsync());

        var removed = await client.GetAsync($"/api/assets/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, removed.StatusCode);
    }
}
