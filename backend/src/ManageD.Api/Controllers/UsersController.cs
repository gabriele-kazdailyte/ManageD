using System.ComponentModel.DataAnnotations;
using ManageD.Api.Models;
using ManageD.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ManageD.Api.Controllers;

public class RegisterUserRequest
{
    public const int PasswordMinLength = 8;

    // Capped so nobody can make the server hash a huge input.
    public const int PasswordMaxLength = 128;

    // ASCII letters, digits and underscores only, so look-alike characters can't imitate someone else's username.
    [Required]
    [StringLength(User.UsernameMaxLength, MinimumLength = User.UsernameMinLength)]
    [RegularExpression("^[A-Za-z0-9_]+$", ErrorMessage = "The username can only contain letters, digits and underscores.")]
    public string Username { get; set; } = string.Empty;

    // Not trimmed: spaces in a password are part of it.
    [Required]
    [StringLength(PasswordMaxLength, MinimumLength = PasswordMinLength)]
    public string Password { get; set; } = string.Empty;

    // [Required] also rejects a name that is only spaces.
    [Required]
    [StringLength(User.DisplayNameMaxLength)]
    public string DisplayName { get; set; } = string.Empty;
}

public class LoginRequest
{
    // Only length-checked: a wrong username or password gets the same 401 whatever it contains.
    [Required]
    [MaxLength(User.UsernameMaxLength)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [MaxLength(RegisterUserRequest.PasswordMaxLength)]
    public string Password { get; set; } = string.Empty;
}

[ApiController]
[Route("api/users")]
public class UsersController : ApiControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitPolicies.Register)]
    public async Task<IActionResult> RegisterAsync(RegisterUserRequest request, CancellationToken cancellationToken)
    {
        var result = await _userService.RegisterAsync(request.Username, request.Password, request.DisplayName, cancellationToken);

        return result.Value is { } user
            ? CreatedAtRoute("GetUserById", new { id = user.Id }, user)
            : ToActionResult(result);
    }

    [HttpPost("login")]
    [EnableRateLimiting(RateLimitPolicies.Login)]
    public async Task<IActionResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        return ToActionResult(await _userService.LoginAsync(request.Username, request.Password, cancellationToken));
    }

    [HttpGet("{id}", Name = "GetUserById")]
    public async Task<IActionResult> GetUserAsync(Guid id, CancellationToken cancellationToken)
    {
        return ToActionResult(await _userService.GetAsync(id, cancellationToken));
    }
}
