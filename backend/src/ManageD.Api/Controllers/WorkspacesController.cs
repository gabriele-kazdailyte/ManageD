using System.ComponentModel.DataAnnotations;
using ManageD.Api.Models;
using ManageD.Api.Services;
using Microsoft.AspNetCore.Mvc;

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
    private readonly WorkspaceService _workspaceService;

    public WorkspacesController(WorkspaceService workspaceService)
    {
        _workspaceService = workspaceService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateWorkspaceAsync(
        CreateWorkspaceRequest request,
        CancellationToken cancellationToken)
    {
        // [Required] rejects a missing CreatorUserId with a 400 before this runs, so it can't be null here.
        var workspace = await _workspaceService.CreateAsync(request.Name, request.CreatorUserId!.Value, cancellationToken);

        return workspace is null ? NotFound() : StatusCode(StatusCodes.Status201Created, workspace);
    }

    [HttpGet]
    public async Task<IActionResult> GetWorkspacesAsync(
        [Required] Guid? userId,
        CancellationToken cancellationToken)
    {
        // [Required] rejects a missing userId with a 400 before this runs, so it can't be null here.
        var workspaces = await _workspaceService.ListForUserAsync(userId!.Value, cancellationToken);

        return workspaces is null ? NotFound() : Ok(workspaces);
    }

    [HttpGet("{id}/members")]
    public async Task<IActionResult> GetMembersAsync(Guid id, CancellationToken cancellationToken)
    {
        var members = await _workspaceService.ListMembersAsync(id, cancellationToken: cancellationToken);

        return members is null ? NotFound() : Ok(members);
    }

    [HttpPost("{id}/members")]
    public async Task<IActionResult> AddMemberAsync(Guid id, AddMemberRequest request, CancellationToken cancellationToken)
    {
        // [Required] rejects a missing UserId with a 400 before this runs, so it can't be null here.
        var (result, member) = await _workspaceService.AddMemberAsync(id, request.UserId!.Value, cancellationToken);

        return result switch
        {
            AddMemberResult.Added => StatusCode(StatusCodes.Status201Created, member),
            AddMemberResult.AlreadyMember => Ok(member),
            AddMemberResult.WorkspaceNotFound => Problem(detail: "Workspace not found.", statusCode: StatusCodes.Status404NotFound),
            AddMemberResult.UserNotFound => Problem(detail: "No user with that ID exists.", statusCode: StatusCodes.Status404NotFound),
            _ => throw new NotSupportedException($"Unexpected result '{result}'."),
        };
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteWorkspaceAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _workspaceService.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
    }
}
