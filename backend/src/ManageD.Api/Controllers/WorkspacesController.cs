using System.ComponentModel.DataAnnotations;
using ManageD.Api.Data;
using ManageD.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ManageD.Api.Controllers;

public class CreateWorkspaceRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public Guid? CreatorUserId { get; set; }
}

public class AddMemberRequest
{
    [Required]
    public Guid? UserId { get; set; }
}

[ApiController]
[Route("api/workspaces")]
public class WorkspacesController : ControllerBase
{
    private readonly ManageDDbContext _dbContext;

    public WorkspacesController(ManageDDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpPost]
    public async Task<IActionResult> CreateWorkspaceAsync(
        CreateWorkspaceRequest request,
        CancellationToken cancellationToken)
    {
        var creator = await _dbContext.Users
            .FirstOrDefaultAsync(user => user.Id == request.CreatorUserId, cancellationToken);

        if (creator is null)
        {
            return NotFound();
        }

        var workspace = new Workspace
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            CreatedAt = DateTime.UtcNow,
        };
        workspace.Users.Add(creator);

        _dbContext.Workspaces.Add(workspace);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return StatusCode(
            StatusCodes.Status201Created,
            new { id = workspace.Id, name = workspace.Name });
    }

    [HttpGet]
    public async Task<IActionResult> GetWorkspacesAsync(
        [Required] Guid? userId,
        CancellationToken cancellationToken)
    {
        var userExists = await _dbContext.Users
            .AnyAsync(user => user.Id == userId, cancellationToken);

        if (!userExists)
        {
            return NotFound();
        }

        var workspaces = await _dbContext.Workspaces
            .AsNoTracking()
            .Where(workspace => workspace.Users.Any(user => user.Id == userId))
            .Select(workspace => new { workspace.Id, workspace.Name })
            .ToListAsync(cancellationToken);

        return Ok(workspaces);
    }

    [HttpPost("{id}/members")]
    public IActionResult AddMember(Guid id, AddMemberRequest request)
    {
        throw new NotImplementedException();
    }

    [HttpDelete("{id}")]
    public IActionResult DeleteWorkspace(Guid id)
    {
        throw new NotImplementedException();
    }
}
