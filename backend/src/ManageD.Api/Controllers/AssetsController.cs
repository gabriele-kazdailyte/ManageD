using ManageD.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ManageD.Api.Controllers;

[ApiController]
[Route("api/assets")]
public class AssetsController : ControllerBase
{
    private readonly PresetCatalog _presetCatalog;

    public AssetsController(PresetCatalog presetCatalog)
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
