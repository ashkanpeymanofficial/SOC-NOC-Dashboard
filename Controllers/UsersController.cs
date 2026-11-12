using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SocCenter.Data;
using SocCenter.Models;

namespace SocCenter.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<UsersController> _logger;

    public UsersController(AppDbContext db, ILogger<UsersController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllUsers()
    {
        try
        {
            var users = await _db.Users
                .Select(u => new
                {
                    u.Id,
                    u.Username,
                    u.Role,
                    u.CreatedAt,
                    u.LastLoginAt,
                    u.IsLocked
                })
                .ToListAsync();

            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطا در دریافت لیست کاربران");
            return StatusCode(500, new { message = "خطای سرور: " + ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] RegisterRequest req)
    {
        try
        {
            if (await _db.Users.AnyAsync(u => u.Username == req.Username))
                return BadRequest(new { message = "نام کاربری تکراری است" });

            if (req.Password.Length < 8)
                return BadRequest(new { message = "رمز عبور باید حداقل ۸ کاراکتر باشد" });

            var user = new User
            {
                Username = req.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
                Role = req.Role,
                CreatedAt = DateTime.UtcNow
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            return Ok(new { message = "کاربر ساخته شد" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطا در ساخت کاربر");
            return StatusCode(500, new { message = "خطای سرور: " + ex.Message });
        }
    }

    [HttpPut("{id}/toggle-lock")]
    public async Task<IActionResult> ToggleLock(int id)
    {
        try
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "کاربر یافت نشد" });
            if (user.Username == "admin") return BadRequest(new { message = "امکان قفل کردن admin وجود ندارد" });

            user.IsLocked = !user.IsLocked;
            await _db.SaveChangesAsync();
            
            return Ok(new { message = "وضعیت تغییر کرد", isLocked = user.IsLocked });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "خطای سرور: " + ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        try
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "کاربر یافت نشد" });
            if (user.Username == "admin") return BadRequest(new { message = "امکان حذف admin وجود ندارد" });

            _db.Users.Remove(user);
            await _db.SaveChangesAsync();
            
            return Ok(new { message = "کاربر حذف شد" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "خطای سرور: " + ex.Message });
        }
    }
}