using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace ManageD.Api.Services;

// Limits how often one IP address can try to log in or register, to slow down password guessing.
// The numbers come from the "RateLimits" section of appsettings, so tests can raise them.
public static class RateLimitPolicies
{
    public const string Login = "login";
    public const string Register = "register";

    public static IServiceCollection AddAuthRateLimits(this IServiceCollection services, IConfiguration configuration)
    {
        return services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            AddPerIpPolicy(options, Login, configuration.GetSection("RateLimits:Login"), defaultPermitLimit: 5);
            AddPerIpPolicy(options, Register, configuration.GetSection("RateLimits:Register"), defaultPermitLimit: 10);
        });
    }

    private static void AddPerIpPolicy(RateLimiterOptions options, string policyName, IConfigurationSection section, int defaultPermitLimit)
    {
        var permitLimit = section.GetValue("PermitLimit", defaultPermitLimit);
        var window = TimeSpan.FromSeconds(section.GetValue("WindowSeconds", 60));

        options.AddPolicy(policyName, httpContext => RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitLimit,
                Window = window,
                QueueLimit = 0,
            }));
    }
}
