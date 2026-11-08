using System.Text.Json.Serialization;
using ManageD.Api.Data;
using ManageD.Api.Hubs;
using ManageD.Api.Services;
using Microsoft.AspNetCore.SignalR;
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
builder.Services.AddScoped<IAssetService, AssetService>();
builder.Services.AddScoped<IWorkspaceService, WorkspaceService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddSingleton<PresetCatalog>();
builder.Services.AddSingleton<IAssetLocks, AssetLocks>();

builder.Services.AddSignalR(options => options.AddFilter<DomainExceptionHubFilter>())
    .AddJsonProtocol(options => options.PayloadSerializerOptions.Converters.Add(
        new JsonStringEnumConverter(allowIntegerValues: false)));

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

builder.Services.AddCors(options => options.AddPolicy("Frontend", policy => policy
    .WithOrigins(allowedOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

builder.Services.AddSingleton<IPresenceService, PresenceService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("Frontend");

app.MapControllers();
app.MapHub<WorkspaceHub>("/hubs/workspace");

app.Run();
