using System.Net;
using System.Net.Http.Json;
using ManageD.Api.Data;
using ManageD.Api.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ManageD.Api.Tests;

public class WorkspacesApiTests : IClassFixture<ManageDFactory>
{
    private readonly ManageDFactory _factory;

    public WorkspacesApiTests(ManageDFactory factory)
    {
        _factory = factory;
    }

    private Task<HttpResponseMessage> CreateAsync(object? name, object? creatorUserId)
    {
        return _factory.CreateClient().PostAsJsonAsync("/api/workspaces", new { name, creatorUserId });
    }

    private Task<HttpResponseMessage> AddMemberRequestAsync(Guid workspaceId, Guid userId)
    {
        return _factory.CreateClient().PostAsJsonAsync($"/api/workspaces/{workspaceId}/members", new { userId });
    }

    private async Task<IReadOnlyList<MemberSummary>> GetMembersAsync(Guid workspaceId)
    {
        var members = await _factory.CreateClient()
            .GetFromJsonAsync<List<MemberSummary>>($"/api/workspaces/{workspaceId}/members");
        return members!;
    }

    [Fact]
    public async Task Create_returns_the_trimmed_workspace_and_makes_the_creator_a_member()
    {
        var creator = await _factory.CreateUserAsync("Creator");

        var response = await CreateAsync("  Sprint plan  ", creator);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var workspace = await response.Content.ReadFromJsonAsync<WorkspaceSummary>();
        Assert.Equal("Sprint plan", workspace!.Name);
        Assert.NotEqual(Guid.Empty, workspace.Id);

        var members = await GetMembersAsync(workspace.Id);
        Assert.Equal(creator, Assert.Single(members).Id);
    }

    [Fact]
    public async Task Create_for_an_unknown_creator_returns_404_and_stores_nothing()
    {
        var response = await CreateAsync("Ghost workspace", Guid.NewGuid());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ManageDDbContext>();
        Assert.False(await db.Workspaces.AnyAsync(w => w.Name == "Ghost workspace"));
    }

    [Fact]
    public async Task Create_rejects_a_missing_creator()
    {
        var response = await CreateAsync("No creator", null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public async Task Create_rejects_a_missing_name(string? name)
    {
        var creator = await _factory.CreateUserAsync("Creator");

        var response = await CreateAsync(name, creator);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_rejects_a_name_over_100_characters_and_accepts_exactly_100()
    {
        var creator = await _factory.CreateUserAsync("Creator");

        var tooLong = await CreateAsync(new string('a', 101), creator);
        var exact = await CreateAsync(new string('a', 100), creator);

        Assert.Equal(HttpStatusCode.BadRequest, tooLong.StatusCode);
        Assert.Equal(HttpStatusCode.Created, exact.StatusCode);
    }

    [Fact]
    public async Task List_returns_only_the_workspaces_the_user_belongs_to()
    {
        var alice = await _factory.CreateUserAsync("Alice");
        var bob = await _factory.CreateUserAsync("Bob");
        var shared = await _factory.CreateWorkspaceAsync(alice);
        var aliceOnly = await _factory.CreateWorkspaceAsync(alice);
        var bobOnly = await _factory.CreateWorkspaceAsync(bob);
        await _factory.AddMemberAsync(shared, bob);

        var aliceList = await _factory.CreateClient().GetFromJsonAsync<List<WorkspaceSummary>>($"/api/workspaces?userId={alice}");
        var bobList = await _factory.CreateClient().GetFromJsonAsync<List<WorkspaceSummary>>($"/api/workspaces?userId={bob}");

        Assert.Equal(new[] { shared, aliceOnly }.Order(), aliceList!.Select(w => w.Id).Order());
        Assert.Equal(new[] { shared, bobOnly }.Order(), bobList!.Select(w => w.Id).Order());
        Assert.All(aliceList!, w => Assert.Equal("Test workspace", w.Name));
    }

    [Fact]
    public async Task List_is_empty_for_a_user_without_workspaces()
    {
        var user = await _factory.CreateUserAsync("Loner");

        var response = await _factory.CreateClient().GetAsync($"/api/workspaces?userId={user}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty((await response.Content.ReadFromJsonAsync<List<WorkspaceSummary>>())!);
    }

    [Fact]
    public async Task List_for_an_unknown_user_returns_404()
    {
        var response = await _factory.CreateClient().GetAsync($"/api/workspaces?userId={Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task List_without_a_user_id_returns_400()
    {
        var response = await _factory.CreateClient().GetAsync("/api/workspaces");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Members_are_listed_by_display_name()
    {
        var zed = await _factory.CreateUserAsync("Zed");
        var amy = await _factory.CreateUserAsync("Amy");
        var workspace = await _factory.CreateWorkspaceAsync(zed);
        await _factory.AddMemberAsync(workspace, amy);

        var members = await GetMembersAsync(workspace);

        Assert.Equal(new[] { "Amy", "Zed" }, members.Select(m => m.DisplayName));
        Assert.Equal(new[] { amy, zed }, members.Select(m => m.Id));
    }

    [Fact]
    public async Task Members_of_an_unknown_workspace_returns_404()
    {
        var response = await _factory.CreateClient().GetAsync($"/api/workspaces/{Guid.NewGuid()}/members");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task AddMember_returns_201_with_the_member_and_stores_the_membership()
    {
        var owner = await _factory.CreateUserAsync("Owner");
        var newcomer = await _factory.CreateUserAsync("Newcomer");
        var workspace = await _factory.CreateWorkspaceAsync(owner);

        var response = await AddMemberRequestAsync(workspace, newcomer);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var member = await response.Content.ReadFromJsonAsync<MemberSummary>();
        Assert.Equal(new MemberSummary(newcomer, "Newcomer"), member);

        Assert.Contains(await GetMembersAsync(workspace), m => m.Id == newcomer);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ManageDDbContext>();
        var stored = await db.Workspaces.Include(w => w.Users).AsNoTracking().SingleAsync(w => w.Id == workspace);
        Assert.Equal(2, stored.Users.Count);
    }

    [Fact]
    public async Task AddMember_twice_returns_200_and_does_not_duplicate_the_member()
    {
        var owner = await _factory.CreateUserAsync("Owner");
        var newcomer = await _factory.CreateUserAsync("Newcomer");
        var workspace = await _factory.CreateWorkspaceAsync(owner);
        await AddMemberRequestAsync(workspace, newcomer);

        var again = await AddMemberRequestAsync(workspace, newcomer);
        var alreadyOwner = await AddMemberRequestAsync(workspace, owner);

        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        Assert.Equal(HttpStatusCode.OK, alreadyOwner.StatusCode);
        Assert.Equal(newcomer, (await again.Content.ReadFromJsonAsync<MemberSummary>())!.Id);
        Assert.Equal(2, (await GetMembersAsync(workspace)).Count);
    }

    [Fact]
    public async Task AddMember_with_an_unknown_user_returns_a_404_problem()
    {
        var owner = await _factory.CreateUserAsync("Owner");
        var workspace = await _factory.CreateWorkspaceAsync(owner);

        var response = await AddMemberRequestAsync(workspace, Guid.NewGuid());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal(404, problem!.Status);
        Assert.Equal("No user with that ID exists.", problem.Detail);
        Assert.Single(await GetMembersAsync(workspace));
    }

    [Fact]
    public async Task AddMember_to_an_unknown_workspace_returns_a_404_problem()
    {
        var user = await _factory.CreateUserAsync("Someone");

        var response = await AddMemberRequestAsync(Guid.NewGuid(), user);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal("Workspace not found.", problem!.Detail);
    }

    [Fact]
    public async Task AddMember_without_a_user_id_returns_400()
    {
        var owner = await _factory.CreateUserAsync("Owner");
        var workspace = await _factory.CreateWorkspaceAsync(owner);

        var response = await _factory.CreateClient().PostAsJsonAsync($"/api/workspaces/{workspace}/members", new { });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Delete_removes_the_workspace_from_the_owners_list_and_from_the_database()
    {
        var owner = await _factory.CreateUserAsync("Owner");
        var workspace = await _factory.CreateWorkspaceAsync(owner);
        var other = await _factory.CreateWorkspaceAsync(owner);

        var response = await _factory.CreateClient().DeleteAsync($"/api/workspaces/{workspace}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var list = await _factory.CreateClient().GetFromJsonAsync<List<WorkspaceSummary>>($"/api/workspaces?userId={owner}");
        Assert.Equal(other, Assert.Single(list!).Id);
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync($"/api/workspaces/{workspace}/members")).StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ManageDDbContext>();
        Assert.True(await db.Users.AnyAsync(u => u.Id == owner));
    }

    [Fact]
    public async Task Delete_of_an_unknown_workspace_returns_404()
    {
        var response = await _factory.CreateClient().DeleteAsync($"/api/workspaces/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
