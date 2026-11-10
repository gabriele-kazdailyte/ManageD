using ManageD.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;

namespace ManageD.Api.Tests;

public sealed class PresetCatalogTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "manaGeD-" + Guid.NewGuid().ToString("N"));

    public void Dispose() => Directory.Delete(_root, recursive: true);

    private sealed class FakeEnvironment(string root) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "Tests";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = string.Empty;
        public string EnvironmentName { get; set; } = "Test";
        public string ContentRootPath { get; set; } = root;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private PresetCatalog CatalogWith(string json)
    {
        Directory.CreateDirectory(Path.Combine(_root, "Data"));
        File.WriteAllText(Path.Combine(_root, "Data", "todo-presets.json"), json);
        return new PresetCatalog(new FakeEnvironment(_root));
    }

    [Fact]
    public async Task Invalid_presets_are_skipped()
    {
        var tooLong = new string('x', 201);
        var catalog = CatalogWith($$"""
            [
              { "name": "Good", "itemTexts": ["a", "b"] },
              { "name": " ", "itemTexts": ["a"] },
              { "name": "good", "itemTexts": ["duplicate name"] },
              { "name": "Blank item", "itemTexts": ["a", " "] },
              { "name": "Long item", "itemTexts": ["{{tooLong}}"] }
            ]
            """);

        var presets = await catalog.LoadAsync(CancellationToken.None);

        var only = Assert.Single(presets);
        Assert.Equal("Good", only.Name);
    }

    [Fact]
    public async Task Infos_list_names_and_counts_and_leave_out_empty_presets()
    {
        var catalog = CatalogWith("""
            [
              { "name": "Two", "itemTexts": ["a", "b"] },
              { "name": "Empty", "itemTexts": [] }
            ]
            """);

        var infos = await catalog.GetInfosAsync(CancellationToken.None);

        var info = Assert.Single(infos);
        Assert.Equal("Two", info.Name);
        Assert.Equal(2, info.ItemCount);
    }

    [Fact]
    public async Task Find_ignores_case_and_returns_null_for_unknown_names()
    {
        var catalog = CatalogWith("""[ { "name": "Daily standup", "itemTexts": ["a"] } ]""");

        Assert.NotNull(await catalog.FindAsync("DAILY STANDUP", CancellationToken.None));
        Assert.Null(await catalog.FindAsync("nope", CancellationToken.None));
    }
}
