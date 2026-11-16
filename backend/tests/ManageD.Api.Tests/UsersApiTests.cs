using System.Net;
using System.Net.Http.Json;
using ManageD.Api.Data;
using ManageD.Api.Dtos;
using ManageD.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ManageD.Api.Tests;

public class UsersApiTests : IClassFixture<ManageDFactory>
{
    private const string Password = "correct horse battery";

    private readonly ManageDFactory _factory;

    public UsersApiTests(ManageDFactory factory)
    {
        _factory = factory;
    }

    // Usernames must be unique, and the tests share one database, so each test makes its own.
    private static string NewUsername(string prefix = "user") => $"{prefix}_{Guid.NewGuid():N}"[..20];

    private Task<HttpResponseMessage> RegisterAsync(string username, string password = Password, string displayName = "Alice")
    {
        return _factory.CreateClient().PostAsJsonAsync("/api/users", new { username, password, displayName });
    }

    private Task<HttpResponseMessage> LoginAsync(string username, string password = Password)
    {
        return _factory.CreateClient().PostAsJsonAsync("/api/users/login", new { username, password });
    }
    [Fact]
    public async Task Register_returns_the_new_user_without_the_password_or_hash()
    {
        var username = NewUsername("Marius");

        var response = await RegisterAsync(username, displayName: "  Marius Petraitis  ");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("password", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(Password, body);

        var user = await response.Content.ReadFromJsonAsync<UserSummary>();
        Assert.Equal(username, user!.Username);
        Assert.Equal("Marius Petraitis", user.DisplayName);
        Assert.Equal($"/api/users/{user.Id}", response.Headers.Location!.AbsolutePath);
    }

    [Fact]
    public async Task Register_stores_a_hash_not_the_password()
    {
        var username = NewUsername();
        var response = await RegisterAsync(username);
        var user = await response.Content.ReadFromJsonAsync<UserSummary>();

        using var scope = _factory.Services.CreateScope();
        var stored = await scope.ServiceProvider.GetRequiredService<ManageDDbContext>()
            .Users.AsNoTracking().SingleAsync(u => u.Id == user!.Id);

        Assert.NotEqual(Password, stored.PasswordHash);
        Assert.DoesNotContain(Password, stored.PasswordHash);
        Assert.Equal(username.ToLowerInvariant(), stored.NormalizedUsername);
    }
    [Fact]
    public async Task Register_rejects_a_taken_username_whatever_its_case()
    {
        var username = NewUsername("Marius");
        await RegisterAsync(username);

        var sameCase = await RegisterAsync(username);
        var otherCase = await RegisterAsync(username.ToLowerInvariant());

        Assert.Equal(HttpStatusCode.Conflict, sameCase.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, otherCase.StatusCode);
        var problem = await otherCase.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal(UserService.UsernameTakenError, problem!.Detail);
    }

    [Theory]
    [InlineData("ab")] // too short
    [InlineData("abcdefghijklmnopqrstuvwxyz1234567")] // 33 characters, too long
    [InlineData("has space")]
    [InlineData("dash-name")]
    [InlineData("Rūta")] // non-ASCII letters aren't allowed in usernames
    [InlineData("")]
    public async Task Register_rejects_an_invalid_username(string username)
    {
        var response = await RegisterAsync(username);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("short")] // under 8 characters
    [InlineData("")]
    public async Task Register_rejects_a_short_password(string password)
    {
        var response = await RegisterAsync(NewUsername(), password);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Register_rejects_a_password_over_128_characters()
    {
        var response = await RegisterAsync(NewUsername(), new string('a', 129));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("abcdefghijklmnopqrstuvwxyz1234567")] // 33 characters, too long
    public async Task Register_rejects_an_invalid_display_name(string displayName)
    {
        var response = await RegisterAsync(NewUsername(), displayName: displayName);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Register_accepts_accents_and_spaces_in_the_display_name()
    {
        var response = await RegisterAsync(NewUsername(), displayName: "Tadas Žuvikas");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }
    [Fact]
    public async Task Login_returns_the_user_for_the_right_password_in_any_username_case()
    {
        var username = NewUsername("Marius");
        var registered = await (await RegisterAsync(username)).Content.ReadFromJsonAsync<UserSummary>();

        var response = await LoginAsync(username.ToUpperInvariant());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var user = await response.Content.ReadFromJsonAsync<UserSummary>();
        Assert.Equal(registered, user);
    }

    [Fact]
    public async Task Login_gives_the_same_401_for_a_wrong_password_and_an_unknown_user()
    {
        var username = NewUsername();
        await RegisterAsync(username);

        var wrongPassword = await LoginAsync(username, "not the password");
        var unknownUser = await LoginAsync(NewUsername("nobody"));

        Assert.Equal(HttpStatusCode.Unauthorized, wrongPassword.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, unknownUser.StatusCode);
        var wrongPasswordProblem = await wrongPassword.Content.ReadFromJsonAsync<ProblemDetails>();
        var unknownUserProblem = await unknownUser.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal(UserService.InvalidLoginError, wrongPasswordProblem!.Detail);
        Assert.Equal(wrongPasswordProblem.Detail, unknownUserProblem!.Detail);
    }

    [Fact]
    public async Task Login_password_is_case_sensitive()
    {
        var username = NewUsername();
        await RegisterAsync(username);

        var response = await LoginAsync(username, Password.ToUpperInvariant());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Get_returns_the_username_and_display_name()
    {
        var username = NewUsername();
        var registered = await (await RegisterAsync(username)).Content.ReadFromJsonAsync<UserSummary>();

        var user = await _factory.CreateClient().GetFromJsonAsync<UserSummary>($"/api/users/{registered!.Id}");

        Assert.Equal(registered, user);
    }
    [Fact]
    public async Task Login_is_rate_limited_per_address()
    {
        using var limited = _factory.WithWebHostBuilder(builder => builder.UseSetting("RateLimits:Login:PermitLimit", "2"));
        var client = limited.CreateClient();
        var attempt = new { username = NewUsername("nobody"), password = "wrong password" };

        var first = await client.PostAsJsonAsync("/api/users/login", attempt);
        var second = await client.PostAsJsonAsync("/api/users/login", attempt);
        var third = await client.PostAsJsonAsync("/api/users/login", attempt);

        Assert.Equal(HttpStatusCode.Unauthorized, first.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, second.StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, third.StatusCode);
    }
}
