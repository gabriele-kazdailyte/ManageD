using ManageD.Api.Common;
using ManageD.Api.Dtos;

namespace ManageD.Api.Services;

public interface IUserService
{
    Task<Result<UserSummary>> RegisterAsync(string username, string password, string displayName, CancellationToken cancellationToken);

    Task<Result<UserSummary>> GetAsync(Guid id, CancellationToken cancellationToken);
}
