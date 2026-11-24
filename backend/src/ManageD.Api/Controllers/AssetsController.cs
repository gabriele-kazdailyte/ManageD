using ManageD.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ManageD.Api.Controllers;

[ApiController]
[Route("api/assets")]
public class AssetsController : ControllerBase
{
    private readonly IPresetCatalog _presetCatalog;

    public AssetsController(IPresetCatalog presetCatalog)
    {
        _presetCatalog = presetCatalog;
    }

    [HttpGet("presets")]
    public async Task<IActionResult> GetPresetsAsync(CancellationToken cancellationToken)
    {
        var presets = await _presetCatalog.GetInfosAsync(cancellationToken);

        return Ok(presets);
    }
}
