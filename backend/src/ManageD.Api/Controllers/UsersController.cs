using System.ComponentModel.DataAnnotations;
using ManageD.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ManageD.Api.Controllers;

public class RegisterUserRequest
{
    [Required]
    public string Username { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;

    [Required]
    public string DisplayName { get; set; } = string.Empty;
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
    public async Task<IActionResult> RegisterAsync(RegisterUserRequest request, CancellationToken cancellationToken)
    {
        var result = await _userService.RegisterAsync(request.Username, request.Password, request.DisplayName, cancellationToken);

        return result.Value is { } user
            ? CreatedAtRoute("GetUserById", new { id = user.Id }, user)
            : ToActionResult(result);
    }

    [HttpGet("{id}", Name = "GetUserById")]
    public async Task<IActionResult> GetUserAsync(Guid id, CancellationToken cancellationToken)
    {
        return ToActionResult(await _userService.GetAsync(id, cancellationToken));
    }
}
