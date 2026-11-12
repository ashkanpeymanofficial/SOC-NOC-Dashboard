using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SocCenter.Data;
using SocCenter.Models;
using SocCenter.Services;

namespace SocCenter.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly JwtService _jwt;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AppDbContext db, JwtService jwt, ILogger<AuthController> logger)
    {
        _db = db;
        _jwt = jwt;
        _logger = logger;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        try
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == req.Username);

            if (user == null)
            {
                _logger.LogWarning("تلاش ورود با کاربر ناموجود: {Username}", req.Username);
                return Unauthorized(new { message = "نام کاربری یا رمز عبور اشتباه است" });
            }

            if (user.IsLocked)
            {
                _logger.LogWarning("تلاش ورود به حساب قفل شده: {Username}", req.Username);
                return Unauthorized(new { message = "حساب کاربری قفل شده است" });
            }

            if (!BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            {
                user.FailedLoginAttempts++;
                if (user.FailedLoginAttempts >= 5)
                {
                    user.IsLocked = true;
                }
                await _db.SaveChangesAsync();
                return Unauthorized(new { message = "نام کاربری یا رمز عبور اشتباه است" });
            }

            user.FailedLoginAttempts = 0;
            user.LastLoginAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var token = _jwt.GenerateToken(user);
            return Ok(new { token, username = user.Username, role = user.Role });
        }
        catch (Exception ex)
        {
            // این بخش از برگشت HTML به جای JSON جلوگیری می‌کند
            _logger.LogError(ex, "خطا در فرآیند ورود");
            return StatusCode(500, new { message = "خطای داخلی سرور رخ داده است" });
        }
    }
}