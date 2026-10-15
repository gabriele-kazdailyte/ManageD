using ManageD.Api.Data;
using ManageD.Api.Dtos;
using ManageD.Api.Models;

namespace ManageD.Api.Services;

public class EfAssetStore : IAssetStore
{
    private readonly ManageDDbContext _dbContext;
    
    public EfAssetStore(ManageDDbContext dbContext)
    {
        _dbContext = dbContext;
    }
}