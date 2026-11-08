namespace ManageD.Api.Common;

public sealed class InvalidRequestException : DomainException
{
    public InvalidRequestException(string message)
        : base(message)
    {
    }
}
