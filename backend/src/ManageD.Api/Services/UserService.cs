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
    public const string InvalidLoginError = "Wrong username or password.";
    private const int SqliteConstraintError = 19;
    private readonly ManageDDbContext _dbContext;
    private readonly IPasswordHasher<User> _passwordHasher;
    // Shared by every instance: UserService is scoped, so a per-instance hash would be
    // computed during the login request and make unknown usernames slower than real ones.
    private static string? s_dummyHash;

    public UserService(ManageDDbContext dbContext, IPasswordHasher<User> passwordHasher)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;

        LazyInitializer.EnsureInitialized(
            ref s_dummyHash,
            () => passwordHasher.HashPassword(new User(), Guid.NewGuid().ToString()));
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

    public async Task<Result<UserSummary>> LoginAsync(string username, string password, CancellationToken cancellationToken)
    {
        var normalizedUsername = Normalize(username);
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.NormalizedUsername == normalizedUsername, cancellationToken);

        if (user is null)
        {
            _passwordHasher.VerifyHashedPassword(new User(), s_dummyHash!, password);
            return Result<UserSummary>.Unauthorized(InvalidLoginError);
        }

        var verification = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);

        if (verification == PasswordVerificationResult.Failed)
        {
            return Result<UserSummary>.Unauthorized(InvalidLoginError);
        }

        // The hash was made with older settings (for example fewer iterations), so store it again with the current ones.
        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = _passwordHasher.HashPassword(user, password);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return Result<UserSummary>.Ok(ToSummary(user));
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
