namespace ManageD.Api.Common;

public sealed class UnknownPresetException : DomainException
{
    public UnknownPresetException(string presetName)
        : base($"Unknown preset '{presetName}'.")
    {
    }
}
