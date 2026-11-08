using ManageD.Api.Common;
using ManageD.Api.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace ManageD.Api.Tests;

public class DomainExceptionHubFilterTests
{
    [Fact]
    public async Task Domain_exception_becomes_hub_exception_with_same_message()
    {
        var filter = new DomainExceptionHubFilter();

        var thrown = await Assert.ThrowsAsync<HubException>(async () =>
            await filter.InvokeMethodAsync(null!, _ => throw new InvalidDeltaException("bad delta")));

        Assert.Equal("bad delta", thrown.Message);
    }

    [Fact]
    public async Task Other_exceptions_pass_through_unchanged()
    {
        var filter = new DomainExceptionHubFilter();

        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await filter.InvokeMethodAsync(null!, _ => throw new InvalidOperationException()));
    }
}