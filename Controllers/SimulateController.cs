using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SocCenter;

namespace SocCenter.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SimulateController : ControllerBase
{
    private readonly IHubContext<SecurityHub> _hubContext;
    private readonly ILogger<SimulateController> _logger;

    public SimulateController(IHubContext<SecurityHub> hubContext, ILogger<SimulateController> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    [HttpPost("attack")]
    public async Task<IActionResult> SimulateAttack([FromBody] SimulateAttackRequest req)
    {
        var logEvent = new
        {
            Timestamp = DateTime.UtcNow,
            SourceIp = req.Ip,
            Message = req.Msg,
            Severity = req.Severity
        };

        await _hubContext.Clients.All.SendAsync("ReceiveLog", logEvent);
        _logger.LogWarning("🔴 شبیه‌سازی حمله: {Type} از {IP} - {Severity}", req.Type, req.Ip, req.Severity);

        return Ok(new { success = true });
    }
}

public class SimulateAttackRequest
{
    public string Ip { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Msg { get; set; } = string.Empty;
    public string Severity { get; set; } = "Info";
}