using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.SignalR;

namespace SocCenter.Services;

public class SyslogListenerService : BackgroundService
{
    private readonly IHubContext<SecurityHub> _hubContext;
    private readonly ILogger<SyslogListenerService> _logger;
    private UdpClient? _udpClient;

    public SyslogListenerService(IHubContext<SecurityHub> hubContext, ILogger<SyslogListenerService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            _udpClient = new UdpClient(514);
            _logger.LogInformation("Syslog Listener started on port 514 (UDP)");

            while (!stoppingToken.IsCancellationRequested)
            {
                var result = await _udpClient.ReceiveAsync(stoppingToken);
                var rawMessage = Encoding.UTF8.GetString(result.Buffer).Trim();
                var sourceIp = result.RemoteEndPoint.Address.ToString();

                // حذف تگ <PRIVAL> از ابتدای پیام Syslog
                var message = Regex.Replace(rawMessage, @"^<\d+>", "");

                var logEvent = new
                {
                    Timestamp = DateTime.UtcNow,
                    SourceIp = sourceIp,
                    Message = message,
                    Severity = DetectSeverity(message)
                };

                await _hubContext.Clients.All.SendAsync("ReceiveLog", logEvent, stoppingToken);
                _logger.LogDebug("Syslog received from {SourceIp}: {Message}", sourceIp, message);
            }
        }
        catch (OperationCanceledException) { }
        catch (SocketException ex) when (ex.SocketErrorCode == SocketError.AddressAlreadyInUse)
        {
            _logger.LogError("پورت 514 در حال استفاده است. لطفاً برنامه را با دسترسی Administrator اجرا کنید.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in Syslog listener");
        }
    }

    private string DetectSeverity(string message)
    {
        var lower = message.ToLower();
        if (lower.Contains("attack") || lower.Contains("critical") || lower.Contains("deny") || lower.Contains("exploit"))
            return "Critical";
        if (lower.Contains("warning") || lower.Contains("fail") || lower.Contains("denied") || lower.Contains("error"))
            return "Warning";
        return "Info";
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _udpClient?.Close();
        await base.StopAsync(cancellationToken);
    }
}