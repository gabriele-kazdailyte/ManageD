using Microsoft.EntityFrameworkCore;

namespace ManageD.Api.Data;

public class ManageDDbContext : DbContext
{
    public ManageDDbContext(DbContextOptions<ManageDDbContext> options)
        : base(options)
    {
    }
}