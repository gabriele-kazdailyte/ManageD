using ManageD.Api.Common;
using ManageD.Api.Data;
using ManageD.Api.Dtos;
using ManageD.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace ManageD.Api.Services;

public class UserService : IUserService
{
    public const string UsernameTakenError = "That username is already taken.";

    private const int SqliteConstraintError = 19;
    private readonly ManageDDbContext _dbContext;
    private readonly IPasswordHasher<User> _passwordHasher;

    public UserService(ManageDDbContext dbContext, IPasswordHasher<User> passwordHasher)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
    }

    public static string Normalize(string username) => username.Trim().ToLowerInvariant();

    public async Task<Result<UserSummary>> RegisterAsync(string username, string password, string displayName, CancellationToken cancellationToken)
    {
        var trimmedUsername = username.Trim();
        var normalizedUsername = Normalize(trimmedUsername);

        if (await _dbContext.Users.AnyAsync(u => u.NormalizedUsername == normalizedUsername, cancellationToken))
        {
            return Result<UserSummary>.Conflict(UsernameTakenError);
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = trimmedUsername,
            NormalizedUsername = normalizedUsername,
            DisplayName = displayName.Trim(),
            CreatedAt = DateTime.UtcNow,
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, password);

        _dbContext.Users.Add(user);

        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is SqliteException { SqliteErrorCode: SqliteConstraintError })
        {
            // Someone registered the same username between the check above and this save.
            _dbContext.Entry(user).State = EntityState.Detached;
            return Result<UserSummary>.Conflict(UsernameTakenError);
        }

        return Result<UserSummary>.Created(ToSummary(user));
    }

    public async Task<Result<UserSummary>> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var user = await FindAsync(id, cancellationToken);

        return user.Map(ToSummary);
    }

    private async Task<Result<User>> FindAsync(Guid id, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        return user is null ? Result<User>.NotFound() : Result<User>.Ok(user);
    }

    private static UserSummary ToSummary(User user) => new(user.Id, user.Username, user.DisplayName);
}
