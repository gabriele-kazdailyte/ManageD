using System.ComponentModel.DataAnnotations;
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
public class WorkspacesController : ApiControllerBase
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
        return ToActionResult(await _workspaceService.CreateAsync(request.Name, request.CreatorUserId!.Value, cancellationToken));
    }

    [HttpGet]
    public async Task<IActionResult> GetWorkspacesAsync(
        [Required] Guid? userId,
        CancellationToken cancellationToken)
    {
        // [Required] rejects a missing userId with a 400 before this runs, so it can't be null here.
        return ToActionResult(await _workspaceService.ListForUserAsync(userId!.Value, cancellationToken));
    }

    [HttpGet("{id}/members")]
    public async Task<IActionResult> GetMembersAsync(Guid id, CancellationToken cancellationToken)
    {
        return ToActionResult(await _workspaceService.ListMembersAsync(id, cancellationToken: cancellationToken));
    }

    [HttpPost("{id}/members")]
    public async Task<IActionResult> AddMemberAsync(Guid id, AddMemberRequest request, CancellationToken cancellationToken)
    {
        // [Required] rejects a missing UserId with a 400 before this runs, so it can't be null here.
        return ToActionResult(await _workspaceService.AddMemberAsync(id, request.UserId!.Value, cancellationToken));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteWorkspaceAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _workspaceService.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
    }
}
