namespace ManageD.Api.Common;

public sealed class Result<T>
{
    private Result(ResultStatus status, T? value, string? error)
    {
        Status = status;
        Value = value;
        Error = error;
    }

    public ResultStatus Status { get; }
    public T? Value { get; }
    public string? Error { get; }

    public static Result<T> Ok(T value) => new(ResultStatus.Ok, value, null);

    public static Result<T> Created(T value) => new(ResultStatus.Created, value, null);

    public static Result<T> NotFound(string? error = null) => new(ResultStatus.NotFound, default, error);

    // Converts the value if there is one, a failure is passed on unchanged.
    public Result<TOut> Map<TOut>(Func<T, TOut> convert)
    {
        return Status switch
        {
            ResultStatus.Ok => Result<TOut>.Ok(convert(Value!)),
            ResultStatus.Created => Result<TOut>.Created(convert(Value!)),
            _ => Result<TOut>.NotFound(Error),
        };
    }
}
