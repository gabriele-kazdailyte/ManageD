using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;

namespace ManageD.Api.Controllers;

public class CreateAssetRequest
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public Guid? WorkspaceId { get; set; }
}

[ApiController]
[Route("api/assets")]
public class AssetsController : ControllerBase
{
    [HttpPost]
    public IActionResult CreateAsset(CreateAssetRequest request)
    {
        throw new NotImplementedException();
    }

    [HttpGet]
    public IActionResult GetAssets([Required] Guid? workspaceId)
    {
        throw new NotImplementedException();
    }

    [HttpGet("{id}")]
    public IActionResult GetAsset(Guid id)
    {
        throw new NotImplementedException();
    }

    [HttpDelete("{id}")]
    public IActionResult DeleteAsset(Guid id)
    {
        throw new NotImplementedException();
    }
}
