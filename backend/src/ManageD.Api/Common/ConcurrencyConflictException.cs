namespace ManageD.Api.Common;

/// <summary>Thrown by the store when the row changed under us between load and save.</summary>
public sealed class ConcurrencyConflictException : DomainException
{
    public ConcurrencyConflictException()
        : base("The asset was changed by someone else. Please retry.")
    {
    }
}
