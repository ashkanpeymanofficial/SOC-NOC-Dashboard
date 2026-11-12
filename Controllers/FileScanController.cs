using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SocCenter;

namespace SocCenter.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class FileScanController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;
    private readonly IHubContext<SecurityHub> _hubContext;
    private readonly ILogger<FileScanController> _logger;

    public FileScanController(
        IHttpClientFactory httpClientFactory,
        IConfiguration config,
        IHubContext<SecurityHub> hubContext,
        ILogger<FileScanController> logger)
    {
        _httpClientFactory = httpClientFactory;
        _config = config;
        _hubContext = hubContext;
        _logger = logger;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> ScanFile(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "فایلی انتخاب نشده است" });

        try
        {
            string sha256;
            using (var stream = file.OpenReadStream())
            {
                using var sha = SHA256.Create();
                var hashBytes = await sha.ComputeHashAsync(stream);
                sha256 = Convert.ToHexString(hashBytes).ToLower();
            }

            var isDemoMode = Request.Headers["X-Demo-Mode"].FirstOrDefault() == "true";

            if (isDemoMode)
            {
                var mockResult = new
                {
                    filename = file.FileName,
                    sha256 = sha256,
                    status = "scanned",
                    malicious = 5,
                    suspicious = 2,
                    harmless = 50,
                    undetected = 10,
                    total = 67,
                    isMalware = true
                };

                var alert = new
                {
                    Timestamp = DateTime.UtcNow,
                    SourceIp = "File Scanner",
                    Message = $"CRITICAL: Malware detected in uploaded file '{file.FileName}'",
                    Severity = "Critical"
                };
                
                // این خط هشدار رو به داشبورد می‌فرسته
                await _hubContext.Clients.All.SendAsync("ReceiveLog", alert);

                return Ok(mockResult);
            }

            // ... (بخش واقعی VirusTotal که قبلا داشتیم) ...
            // برای اینکه کد کوتاه بشه، اینجا همون کد حالت واقعی رو بذار یا اگه کلید نداری، همیشه دمو بمونه.
            return Ok(new { status = "not_found", sha256 = sha256, message = "فایل در پایگاه داده یافت نشد" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "خطا: " + ex.Message });
        }
    }
}