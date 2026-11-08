using ManageD.Api.Common;
using ManageD.Api.Dtos;

namespace ManageD.Api.Services;

public interface IUserService
{
    Task<UserSummary> CreateAsync(string displayName, CancellationToken cancellationToken);

    Task<Result<UserSummary>> GetAsync(Guid id, CancellationToken cancellationToken);
}
