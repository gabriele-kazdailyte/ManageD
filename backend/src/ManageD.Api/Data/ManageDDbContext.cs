using ManageD.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ManageD.Api.Data;

public class ManageDDbContext : DbContext
{
    public ManageDDbContext(DbContextOptions<ManageDDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Document> Documents { get; set; } = null!;
    public DbSet<TodoItem> TodoItems { get; set; } = null!;
}
