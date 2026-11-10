using ManageD.Api.Common;

namespace ManageD.Api.Tests;

public class ResultTests
{
    [Fact]
    public void Ok_and_Created_carry_their_value()
    {
        var ok = Result<int>.Ok(5);
        var created = Result<int>.Created(6);

        Assert.Equal(ResultStatus.Ok, ok.Status);
        Assert.Equal(5, ok.Value);
        Assert.Equal(ResultStatus.Created, created.Status);
        Assert.Equal(6, created.Value);
    }

    [Fact]
    public void NotFound_has_no_value_and_keeps_its_error()
    {
        var result = Result<int>.NotFound("missing");

        Assert.Equal(ResultStatus.NotFound, result.Status);
        Assert.Equal("missing", result.Error);
        Assert.Equal(0, result.Value);
    }

    [Fact]
    public void Map_converts_a_value_and_keeps_the_status()
    {
        Assert.Equal("5", Result<int>.Ok(5).Map(n => n.ToString()).Value);
        Assert.Equal(ResultStatus.Created, Result<int>.Created(5).Map(n => n.ToString()).Status);
    }

    [Fact]
    public void Map_passes_a_failure_on_without_calling_the_converter()
    {
        var mapped = Result<int>.NotFound("missing").Map<string>(_ => throw new InvalidOperationException());

        Assert.Equal(ResultStatus.NotFound, mapped.Status);
        Assert.Equal("missing", mapped.Error);
    }
}
