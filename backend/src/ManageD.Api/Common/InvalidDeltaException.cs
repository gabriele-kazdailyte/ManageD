namespace ManageD.Api.Common;

public sealed class InvalidDeltaException : DomainException
{
    public InvalidDeltaException(string message)
        : base(message)
    {
    }
}