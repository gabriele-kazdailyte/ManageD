using ManageD.Api.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace ManageD.Api.Tests;

/// <summary>A real SQLite database in memory. Every context shares one open connection.</summary>
public sealed class SqliteTestDb : IDisposable
{
    private readonly SqliteConnection _connection = new("DataSource=:memory:");

    public SqliteTestDb()
    {
        _connection.Open();
        using var context = CreateContext();
        context.Database.EnsureCreated();
    }

    public ManageDDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ManageDDbContext>()
            .UseSqlite(_connection)
            .Options;
        return new ManageDDbContext(options);
    }

    public void Dispose() => _connection.Dispose();
}