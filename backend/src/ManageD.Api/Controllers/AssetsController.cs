using System.ComponentModel.DataAnnotations;
using ManageD.Api.Models;
using ManageD.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ManageD.Api.Controllers;

public class CreateAssetRequest
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public Guid? WorkspaceId { get; set; }

    [EnumDataType(typeof(TemplateType))]
    public TemplateType? TemplateType { get; set; }
}

[ApiController]
[Route("api/assets")]
public class AssetsController : ControllerBase
{
    private readonly AssetService _assetService;
    private readonly TemplateCatalog _templateCatalog;

    public AssetsController(AssetService assetService, TemplateCatalog templateCatalog)
    {
        _assetService = assetService;
        _templateCatalog = templateCatalog;
    }

    [HttpPost]
    public async Task<IActionResult> CreateAssetAsync(CreateAssetRequest request, CancellationToken cancellationToken)
    {
        // [Required] rejects a missing WorkspaceId with a 400 before this runs, so it can't be null here.
        var asset = await _assetService.CreateAsync(
            request.Title,
            request.WorkspaceId!.Value,
            request.TemplateType ?? TemplateType.Todo,
            cancellationToken);

        return asset is null
            ? NotFound()
            : CreatedAtRoute("GetAssetById", new { id = asset.Id }, asset);
    }

    [HttpGet]
    public async Task<IActionResult> GetAssetsAsync([Required] Guid? workspaceId, CancellationToken cancellationToken)
    {
        // [Required] rejects a missing workspaceId with a 400 before this runs, so it can't be null here.
        var assets = await _assetService.ListAsync(workspaceId!.Value, cancellationToken);

        return assets is null ? NotFound() : Ok(assets);
    }

    [HttpGet("{id}", Name = "GetAssetById")]
    public async Task<IActionResult> GetAssetAsync(Guid id, CancellationToken cancellationToken)
    {
        var asset = await _assetService.GetAsync(id, cancellationToken);

        return asset is null ? NotFound() : Ok(asset);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAssetAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _assetService.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
    }

    [HttpGet("templates")]
    public async Task<IActionResult> GetTemplatesAsync(CancellationToken cancellationToken)
    {
        var templates = await _templateCatalog.GetInfosAsync(cancellationToken);

        return Ok(templates);
    }
}
