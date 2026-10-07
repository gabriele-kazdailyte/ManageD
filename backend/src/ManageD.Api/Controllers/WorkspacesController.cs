using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;

namespace ManageD.Api.Controllers;

public class CreateWorkspaceRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    public Guid CreatorId { get; set; }
}

public class AddMemberRequest
{
    public Guid UserId { get; set; }
}

[ApiController]
[Route("api/workspaces")]
public class WorkspacesController : ControllerBase
{
    [HttpPost]
    public IActionResult CreateWorkspace(CreateWorkspaceRequest request)
    {
        throw new NotImplementedException();
    }

    [HttpGet]
    public IActionResult GetWorkspaces(Guid userId)
    {
        throw new NotImplementedException();
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
