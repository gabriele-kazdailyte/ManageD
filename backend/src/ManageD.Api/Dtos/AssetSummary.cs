using ManageD.Api.Models;

namespace ManageD.Api.Dtos;

// A lightweight list entry for GET /api/assets?workspaceId=, without the items themselves.
public record AssetSummary(
    Guid Id,
    string Title,
    TemplateType TemplateType,
    DateTime UpdatedAt,
    int ItemCount);
