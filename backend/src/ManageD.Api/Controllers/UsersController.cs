using System.ComponentModel.DataAnnotations;
using ManageD.Api.Data;
using ManageD.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
    private readonly ManageDDbContext _dbContext;

    public UsersController(ManageDDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpPost]
    public async Task<IActionResult> CreateUserAsync(CreateUserRequest request, CancellationToken cancellationToken)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            DisplayName = request.DisplayName.Trim(),
            CreatedAt = DateTime.UtcNow,
        };

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtRoute(
            "GetUserById",
            new { id = user.Id },
            new { id = user.Id, displayName = user.DisplayName });
    }

    [HttpGet("{id}", Name = "GetUserById")]
    public async Task<IActionResult> GetUserAsync(Guid id, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users
            .AsNoTracking()
            .Where(user => user.Id == id)
            .Select(user => new { user.Id, user.DisplayName })
            .FirstOrDefaultAsync(cancellationToken);

        return user is null ? NotFound() : Ok(user);
    }
}
