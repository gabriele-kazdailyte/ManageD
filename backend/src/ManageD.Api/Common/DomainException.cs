namespace ManageD.Api.Common;

/// <summary>Base for expected business-rule failures. Their message is safe to show to clients.</summary>
public abstract class DomainException : Exception
{
    protected DomainException(string message)
        : base(message)
    {
    }
}
