using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;

namespace ManageD.Api.Controllers;

public class CreateUserRequest
{
    [Required]
    [MaxLength(100)]
    public string DisplayName { get; set; } = string.Empty;
}

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    [HttpPost]
    public IActionResult CreateUser(CreateUserRequest request)
    {
        throw new NotImplementedException();
    }

    [HttpGet("{id}")]
    public IActionResult GetUser(Guid id)
    {
        throw new NotImplementedException();
    }
}
