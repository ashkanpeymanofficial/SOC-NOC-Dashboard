using System.Diagnostics;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;

namespace SocCenter.Services;

public class NetworkScannerService
{
    public async Task<List<NetworkDevice>> ScanNetworkAsync()
    {
        var devices = new List<NetworkDevice>();
        var localIp = GetLocalIpAddress();
        if (string.IsNullOrEmpty(localIp)) return devices;

        // پیدا کردن شبکه محلی (مثلا 192.168.1)
        var parts = localIp.Split('.');
        if (parts.Length != 4) return devices;
        var subnet = $"{parts[0]}.{parts[1]}.{parts[2]}";

        var tasks = new List<Task>();

        // اسکن ۱ تا ۲۵۴ در شبکه (به صورت موازی)
        for (int i = 1; i <= 254; i++)
        {
            int ipPart = i;
            tasks.Add(Task.Run(async () =>
            {
                var ip = $"{subnet}.{ipPart}";
                var device = await PingAndGetDetailsAsync(ip);
                if (device != null)
                {
                    lock (devices)
                    {
                        devices.Add(device);
                    }
                }
            }));
        }

        await Task.WhenAll(tasks);
        return devices.OrderBy(d => d.IpAddress).ToList();
    }

    private async Task<NetworkDevice?> PingAndGetDetailsAsync(string ip)
    {
        try
        {
            using var ping = new Ping();
            var reply = await ping.SendPingAsync(ip, 2000);

            if (reply.Status != IPStatus.Success) return null;

            var device = new NetworkDevice
            {
                IpAddress = ip,
                ResponseTime = reply.RoundtripTime,
                Status = "Online"
            };

            // گرفتن اسم دستگاه (Reverse DNS)
            try
            {
                var hostEntry = await Dns.GetHostEntryAsync(ip);
                device.HostName = hostEntry.HostName;
            }
            catch { device.HostName = "Unknown"; }

            // گرفتن MAC Address (از طریق ARP)
            device.MacAddress = GetMacAddress(ip);

            // اسکن پورت‌های رایج
            device.OpenPorts = await ScanCommonPortsAsync(ip);

            return device;
        }
        catch
        {
            return null;
        }
    }

    private string GetMacAddress(string ipAddress)
    {
        try
        {
            // اجرای دستور arp برای گرفتن MAC
            var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "arp",
                    Arguments = $"-a {ipAddress}",
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };
            process.Start();
            var output = process.StandardOutput.ReadToEnd();
            process.WaitForExit();

            // استخراج MAC از خروجی
            var lines = output.Split('\n');
            foreach (var line in lines)
            {
                if (line.Contains(ipAddress))
                {
                    var parts = line.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                    foreach (var part in parts)
                    {
                        if (part.Count(c => c == '-') == 5 || part.Count(c => c == ':') == 5)
                            return part.ToUpper();
                    }
                }
            }
            return "Unknown";
        }
        catch { return "Unknown"; }
    }

    private async Task<List<int>> ScanCommonPortsAsync(string ip)
    {
        var openPorts = new List<int>();
        // پورت‌های رایج: 21 (FTP), 22 (SSH), 23 (Telnet), 80 (HTTP), 443 (HTTPS), 3389 (RDP), 8080
        int[] portsToCheck = { 21, 22, 23, 53, 80, 139, 443, 445, 3389, 8080, 9100 };

        var tasks = portsToCheck.Select(async port =>
        {
            try
            {
                using var client = new TcpClient();
                var connectTask = client.ConnectAsync(ip, port);
                var timeoutTask = Task.Delay(300); // تایم‌اوت ۳۰۰ میلی‌ثانیه
                var completedTask = await Task.WhenAny(connectTask, timeoutTask);

                if (completedTask == connectTask && client.Connected)
                {
                    lock (openPorts) { openPorts.Add(port); }
                    client.Close();
                }
            }
            catch { /* پورت بسته است */ }
        });

        await Task.WhenAll(tasks);
        return openPorts.OrderBy(p => p).ToList();
    }

    private string GetLocalIpAddress()
    {
        try
        {
            var host = Dns.GetHostEntry(Dns.GetHostName());
            foreach (var ip in host.AddressList)
            {
                if (ip.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(ip))
                {
                    var ipStr = ip.ToString();
                    // نادیده گرفتن IPهای مجازی (مثل VPN یا WSL)
                    if (!ipStr.StartsWith("172.") && !ipStr.StartsWith("10.0.0.1"))
                        return ipStr;
                }
            }
            return "";
        }
        catch { return ""; }
    }
}

// مدل داده برای دستگاه‌های شبکه
public class NetworkDevice
{
    public string IpAddress { get; set; } = string.Empty;
    public string MacAddress { get; set; } = string.Empty;
    public string HostName { get; set; } = string.Empty;
    public long ResponseTime { get; set; }
    public string Status { get; set; } = string.Empty;
    public List<int> OpenPorts { get; set; } = new();
}