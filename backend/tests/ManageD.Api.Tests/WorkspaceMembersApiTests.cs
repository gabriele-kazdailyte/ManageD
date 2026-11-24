using System.Net;
using System.Net.Http.Json;
using ManageD.Api.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace ManageD.Api.Tests;

public class WorkspaceMembersApiTests : IClassFixture<ManageDFactory>
{
    private readonly ManageDFactory _factory;

    public WorkspaceMembersApiTests(ManageDFactory factory)
    {
        _factory = factory;
    }

    // Usernames must be unique, and the tests share one database, so each test makes its own.
    private async Task<UserSummary> RegisterAsync(string prefix, string displayName)
    {
        var username = $"{prefix}_{Guid.NewGuid():N}"[..20];
        var response = await _factory.CreateClient().PostAsJsonAsync(
            "/api/users",
            new { username, password = ManageDFactory.TestPassword, displayName });
        response.EnsureSuccessStatusCode();

        return (await response.Content.ReadFromJsonAsync<UserSummary>())!;
    }

    private Task<HttpResponseMessage> AddMemberAsync(Guid workspaceId, string username)
    {
        return _factory.CreateClient().PostAsJsonAsync($"/api/workspaces/{workspaceId}/members", new { username });
    }

    [Fact]
    public async Task Add_member_by_username_returns_201_and_the_member()
    {
        var alice = await RegisterAsync("Alice", "Alice");
        var bob = await RegisterAsync("Bob", "Bob");
        var workspaceId = await _factory.CreateWorkspaceAsync(alice.Id);

        var response = await AddMemberAsync(workspaceId, bob.Username);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var member = await response.Content.ReadFromJsonAsync<MemberSummary>();
        Assert.Equal(new MemberSummary(bob.Id, "Bob"), member);

        var members = await _factory.CreateClient()
            .GetFromJsonAsync<List<MemberSummary>>($"/api/workspaces/{workspaceId}/members");
        Assert.Contains(members!, m => m.Id == bob.Id);
    }

    [Fact]
    public async Task Add_member_ignores_case_and_surrounding_spaces()
    {
        var alice = await RegisterAsync("Alice", "Alice");
        var bob = await RegisterAsync("Bob", "Bob");
        var workspaceId = await _factory.CreateWorkspaceAsync(alice.Id);

        var response = await AddMemberAsync(workspaceId, $"  {bob.Username.ToUpperInvariant()}  ");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var member = await response.Content.ReadFromJsonAsync<MemberSummary>();
        Assert.Equal(bob.Id, member!.Id);
    }

    [Fact]
    public async Task Adding_an_existing_member_again_returns_200()
    {
        var alice = await RegisterAsync("Alice", "Alice");
        var bob = await RegisterAsync("Bob", "Bob");
        var workspaceId = await _factory.CreateWorkspaceAsync(alice.Id);
        await AddMemberAsync(workspaceId, bob.Username);

        var response = await AddMemberAsync(workspaceId, bob.Username);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var member = await response.Content.ReadFromJsonAsync<MemberSummary>();
        Assert.Equal(bob.Id, member!.Id);
    }

    [Fact]
    public async Task Add_member_with_an_unknown_username_returns_404_with_a_reason()
    {
        var alice = await RegisterAsync("Alice", "Alice");
        var workspaceId = await _factory.CreateWorkspaceAsync(alice.Id);

        var response = await AddMemberAsync(workspaceId, "nobody_by_this_name");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal("No user with that username exists.", problem!.Detail);
    }

    [Fact]
    public async Task Add_member_to_an_unknown_workspace_returns_404_with_a_reason()
    {
        var bob = await RegisterAsync("Bob", "Bob");

        var response = await AddMemberAsync(Guid.NewGuid(), bob.Username);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal("Workspace not found.", problem!.Detail);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Add_member_without_a_username_returns_400(string username)
    {
        var alice = await RegisterAsync("Alice", "Alice");
        var workspaceId = await _factory.CreateWorkspaceAsync(alice.Id);

        var response = await AddMemberAsync(workspaceId, username);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Add_member_with_a_too_long_username_returns_400()
    {
        var alice = await RegisterAsync("Alice", "Alice");
        var workspaceId = await _factory.CreateWorkspaceAsync(alice.Id);

        var response = await AddMemberAsync(workspaceId, new string('a', 33));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
