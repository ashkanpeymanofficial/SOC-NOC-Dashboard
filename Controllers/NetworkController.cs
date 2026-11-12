using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SocCenter.Services;

namespace SocCenter.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class NetworkController : ControllerBase
{
    private readonly NetworkScannerService _scanner;
    private readonly ILogger<NetworkController> _logger;

    public NetworkController(NetworkScannerService scanner, ILogger<NetworkController> logger)
    {
        _scanner = scanner;
        _logger = logger;
    }

    [HttpGet("scan")]
    public async Task<IActionResult> Scan()
    {
        try
        {
            _logger.LogInformation("🌐 شروع اسکن شبکه...");
            var devices = await _scanner.ScanNetworkAsync();
            _logger.LogInformation("✅ اسکن شبکه کامل شد. {Count} دستگاه پیدا شد", devices.Count);
            return Ok(devices);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "خطا در اسکن شبکه");
            return StatusCode(500, new { message = "خطا در اسکن شبکه: " + ex.Message });
        }
    }
}