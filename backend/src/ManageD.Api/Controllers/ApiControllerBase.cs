using ManageD.Api.Common;
using ManageD.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ManageD.Api.Controllers;

public abstract class ApiControllerBase : ControllerBase
{
    protected IActionResult ToActionResult<T>(Result<T> result)
    {
        return result.Status switch
        {
            ResultStatus.Ok => Ok(result.Value),
            ResultStatus.Created => StatusCode(StatusCodes.Status201Created, result.Value),
            ResultStatus.NotFound when result.Error is null => NotFound(),
            ResultStatus.NotFound => Problem(detail: result.Error, statusCode: StatusCodes.Status404NotFound),
            _ => throw new NotSupportedException($"Unexpected result status '{result.Status}'."),
        };
    }
}
