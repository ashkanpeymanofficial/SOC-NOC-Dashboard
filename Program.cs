using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using SocCenter;
using SocCenter.Data;
using SocCenter.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Serilog
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/security-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();
builder.Host.UseSerilog();

// 2. Database (SQLite)
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlite("Data Source=soc.db"));

// 3. JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "SuperSecretKeyThatMustBeAtLeast32CharsLong!!";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "SocCenter",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "SocCenterUsers",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });
builder.Services.AddAuthorization();

// 4. Services
builder.Services.AddSingleton<JwtService>();
builder.Services.AddHttpClient();
builder.Services.AddSignalR();
builder.Services.AddHostedService<SyslogListenerService>();
builder.Services.AddSingleton<NetworkScannerService>();
builder.Services.AddControllers();

var app = builder.Build();

// 5. ساخت دیتابیس و کاربر پیش‌فرض (admin)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    
    if (!db.Users.Any())
    {
        db.Users.Add(new SocCenter.Models.User
        {
            Username = "admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
            Role = "Admin"
        });
        db.SaveChanges();
    }
}

app.UseSerilogRequestLogging();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<SecurityHub>("/hubs/security");

app.Run();