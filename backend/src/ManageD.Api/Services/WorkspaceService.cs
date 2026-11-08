using ManageD.Api.Common;
using ManageD.Api.Data;
using ManageD.Api.Dtos;
using ManageD.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ManageD.Api.Services;

public class WorkspaceService
{
    private readonly ManageDDbContext _dbContext;

    public WorkspaceService(ManageDDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<WorkspaceSummary>> CreateAsync(string name, Guid creatorUserId, CancellationToken cancellationToken)
    {
        var creator = await _dbContext.Users.FirstOrDefaultAsync(user => user.Id == creatorUserId, cancellationToken);

        if (creator is null)
        {
            return Result<WorkspaceSummary>.NotFound();
        }

        var workspace = new Workspace
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            CreatedAt = DateTime.UtcNow,
        };
        workspace.Users.Add(creator);

        _dbContext.Workspaces.Add(workspace);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<WorkspaceSummary>.Created(new WorkspaceSummary(workspace.Id, workspace.Name));
    }

    // Returns NotFound when the user doesn't exist.
    public async Task<Result<IReadOnlyList<WorkspaceSummary>>> ListForUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        if (!await _dbContext.Users.AnyAsync(user => user.Id == userId, cancellationToken))
        {
            return Result<IReadOnlyList<WorkspaceSummary>>.NotFound();
        }

        var workspaces = await _dbContext.Workspaces.AsNoTracking()
            .Where(workspace => workspace.Users.Any(user => user.Id == userId))
            .Select(workspace => new WorkspaceSummary(workspace.Id, workspace.Name))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<WorkspaceSummary>>.Ok(workspaces);
    }

    public async Task<Result<IReadOnlyList<MemberSummary>>> ListMembersAsync(
        Guid workspaceId,
        Guid? excludeUserId = null,
        CancellationToken cancellationToken = default)
    {
        if (!await _dbContext.Workspaces.AnyAsync(workspace => workspace.Id == workspaceId, cancellationToken))
        {
            return Result<IReadOnlyList<MemberSummary>>.NotFound();
        }

        var members = await _dbContext.Users
            .AsNoTracking()
            .Where(user => user.Workspaces.Any(workspace => workspace.Id == workspaceId))
            .Where(user => excludeUserId == null || user.Id != excludeUserId)
            .OrderBy(user => user.DisplayName)
            .Select(user => new MemberSummary(user.Id, user.DisplayName))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<MemberSummary>>.Ok(members);
    }

    public async Task<Result<MemberSummary>> AddMemberAsync(
        Guid workspaceId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var workspace = await _dbContext.Workspaces.Include(w => w.Users).FirstOrDefaultAsync(w => w.Id == workspaceId, cancellationToken);

        if (workspace is null)
        {
            return Result<MemberSummary>.NotFound("Workspace not found.");
        }

        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user is null)
        {
            return Result<MemberSummary>.NotFound("No user with that ID exists.");
        }

        var member = new MemberSummary(user.Id, user.DisplayName);

        if (workspace.Users.Any(existing => existing.Id == user.Id))
        {
            return Result<MemberSummary>.Ok(member);
        }

        workspace.Users.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result<MemberSummary>.Created(member);
    }

    public async Task<bool> DeleteAsync(Guid workspaceId, CancellationToken cancellationToken)
    {
        var workspace = await _dbContext.Workspaces.FirstOrDefaultAsync(w => w.Id == workspaceId, cancellationToken);

        if (workspace is null)
        {
            return false;
        }

        _dbContext.Workspaces.Remove(workspace);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public Task<bool> IsMemberAsync(Guid workspaceId, Guid userId, CancellationToken cancellationToken)
    {
        return _dbContext.Workspaces.AnyAsync(
            workspace => workspace.Id == workspaceId && workspace.Users.Any(user => user.Id == userId),
            cancellationToken);
    }
}
