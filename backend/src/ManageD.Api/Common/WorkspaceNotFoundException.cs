namespace ManageD.Api.Common;

public sealed class WorkspaceNotFoundException : DomainException
{
    public WorkspaceNotFoundException(Guid workspaceId)
        : base($"Workspace {workspaceId} was not found.")
    {
    }
}
