using System.Net.Http.Json;
using System.Text.Json.Serialization;
using ManageD.Api.Data;
using ManageD.Api.Dtos;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace ManageD.Api.Tests;

/// <summary>The real app running in memory, with its own in-memory SQLite database.</summary>
public sealed class ManageDFactory : WebApplicationFactory<Program>
{
    // A named in-memory database that every connection of the app can see while the keeper stays open
    private readonly string _connectionString = $"Data Source=test-{Guid.NewGuid():N};Mode=Memory;Cache=Shared";
    private readonly SqliteConnection _keeper;

    public ManageDFactory()
    {
        _keeper = new SqliteConnection(_connectionString);
        _keeper.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:DefaultConnection", _connectionString);
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);

        using var scope = host.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<ManageDDbContext>().Database.EnsureCreated();

        return host;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (disposing)
        {
            _keeper.Dispose();
        }
    }

    public HubConnection CreateHubConnection()
    {
        var server = Server;

        return new HubConnectionBuilder()
            .WithUrl(new Uri(server.BaseAddress, "/hubs/workspace"), options =>
            {
                options.HttpMessageHandlerFactory = _ => server.CreateHandler();
                options.Transports = HttpTransportType.LongPolling;
            })
            .AddJsonProtocol(options => options.PayloadSerializerOptions.Converters.Add(
                new JsonStringEnumConverter(allowIntegerValues: false)))
            .Build();
    }

    public async Task<Guid> CreateUserAsync(string displayName)
    {
        var response = await CreateClient().PostAsJsonAsync("/api/users", new { displayName });
        response.EnsureSuccessStatusCode();

        var user = await response.Content.ReadFromJsonAsync<UserSummary>();
        return user!.Id;
    }

    public async Task<Guid> CreateWorkspaceAsync(Guid creatorUserId)
    {
        var response = await CreateClient().PostAsJsonAsync("/api/workspaces", new { name = "Test workspace", creatorUserId });
        response.EnsureSuccessStatusCode();

        var workspace = await response.Content.ReadFromJsonAsync<WorkspaceSummary>();
        return workspace!.Id;
    }

    public async Task AddMemberAsync(Guid workspaceId, Guid userId)
    {
        var response = await CreateClient().PostAsJsonAsync($"/api/workspaces/{workspaceId}/members", new { userId });
        response.EnsureSuccessStatusCode();
    }
}
