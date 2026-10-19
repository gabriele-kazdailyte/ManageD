using System.Text.Json.Serialization;
using ManageD.Api.Data;
using ManageD.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// The API contract sends enums (e.g. templateType) as their names ("Todo"), never their numbers,
// so numeric values are rejected with a 400 instead of being accepted.
builder.Services.AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(
        new JsonStringEnumConverter(allowIntegerValues: false)));

builder.Services.AddDbContext<ManageDDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IAssetStore, EfAssetStore>();
builder.Services.AddScoped<AssetService>();
builder.Services.AddScoped<WorkspaceService>();
builder.Services.AddSingleton<TemplateCatalog>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.MapControllers();

app.Run();
