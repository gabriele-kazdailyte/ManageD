using ManageD.Api.Data;
using ManageD.Api.Dtos;
using ManageD.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ManageD.Api.Services;

public class UserService
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

    // Returns null when the user doesn't exist.
    public async Task<UserSummary?> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _dbContext.Users
            .AsNoTracking()
            .Where(u => u.Id == id)
            .Select(u => new UserSummary(u.Id, u.DisplayName))
            .FirstOrDefaultAsync(cancellationToken);
    }
}
