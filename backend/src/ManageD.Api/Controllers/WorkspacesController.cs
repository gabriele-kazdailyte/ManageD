using System.ComponentModel.DataAnnotations;
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
    [HttpPost]
    public IActionResult CreateWorkspace(CreateWorkspaceRequest request)
    {
        throw new NotImplementedException();
    }

    [HttpGet]
    public IActionResult GetWorkspaces([Required] Guid? userId)
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
