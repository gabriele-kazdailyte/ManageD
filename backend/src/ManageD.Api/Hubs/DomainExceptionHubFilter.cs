using ManageD.Api.Common;
using Microsoft.AspNetCore.SignalR;

namespace ManageD.Api.Hubs;

/// <summary>Turns expected business failures into HubExceptions so clients receive the message</summary>
public class DomainExceptionHubFilter : IHubFilter
{
    public async ValueTask<object?> InvokeMethodAsync(
        HubInvocationContext invocationContext,
        Func<HubInvocationContext, ValueTask<object?>> next)
    {
        try
        {
            return await next(invocationContext);
        }
        catch (DomainException ex)
        {
            throw new HubException(ex.Message);
        }
    }
}