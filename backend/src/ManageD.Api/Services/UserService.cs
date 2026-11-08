using ManageD.Api.Common;
using ManageD.Api.Data;
using ManageD.Api.Dtos;
using ManageD.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ManageD.Api.Services;

public class UserService : IUserService
{
    private readonly ManageDDbContext _dbContext;

    public UserService(ManageDDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<UserSummary> CreateAsync(string displayName, CancellationToken cancellationToken)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            DisplayName = displayName.Trim(),
            CreatedAt = DateTime.UtcNow,
        };

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new UserSummary(user.Id, user.DisplayName);
    }

    public async Task<Result<UserSummary>> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var user = await FindAsync(id, cancellationToken);

        return user.Map(found => new UserSummary(found.Id, found.DisplayName));
    }

    private async Task<Result<User>> FindAsync(Guid id, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        return user is null ? Result<User>.NotFound() : Result<User>.Ok(user);
    }
}
