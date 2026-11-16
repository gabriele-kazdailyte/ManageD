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
    public DbSet<Workspace> Workspaces { get; set; } = null!;
    public DbSet<Asset> Assets { get; set; } = null!;
    public DbSet<TodoItem> TodoItems { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TodoItem>().Property(i => i.Id).ValueGeneratedNever();

        modelBuilder.Entity<User>(user =>
        {
            user.Property(u => u.Username).HasMaxLength(User.UsernameMaxLength);
            user.Property(u => u.NormalizedUsername).HasMaxLength(User.UsernameMaxLength);
            user.Property(u => u.DisplayName).HasMaxLength(User.DisplayNameMaxLength);
            user.HasIndex(u => u.NormalizedUsername).IsUnique();
        });
    }
}
