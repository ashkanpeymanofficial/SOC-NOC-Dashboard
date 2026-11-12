const scanBtn = document.getElementById('scanBtn');
const loadingBox = document.getElementById('loadingBox');
const devicesTable = document.getElementById('devicesTable');

scanBtn.addEventListener('click', async () => {
    scanBtn.disabled = true;
    scanBtn.textContent = 'در حال اسکن...';
    loadingBox.style.display = 'block';
    devicesTable.innerHTML = '';

    try {
        const response = await fetch('/api/network/scan', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('soc_token')}` }
        });
        
        if (!response.ok) throw new Error('خطا در اسکن شبکه');
        const devices = await response.json();

        renderDevices(devices);
    } catch (err) {
        devicesTable.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--neon-red);">❌ ${err.message}</td></tr>`;
    } finally {
        scanBtn.disabled = false;
        scanBtn.textContent = 'شروع اسکن مجدد';
        loadingBox.style.display = 'none';
    }
});

function renderDevices(devices) {
    let totalPorts = 0;
    let dangerousPorts = 0;

    devices.forEach(d => {
        totalPorts += d.openPorts.length;
        if (d.openPorts.includes(3389) || d.openPorts.includes(22)) {
            dangerousPorts++;
        }
    });

    // آمار بالای صفحه
    document.getElementById('totalDevices').textContent = devices.length;
    document.getElementById('totalPorts').textContent = totalPorts;
    document.getElementById('dangerousPorts').textContent = dangerousPorts;

    if (devices.length === 0) {
        devicesTable.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">دستگاهی در شبکه پیدا نشد</td></tr>`;
        return;
    }

    devicesTable.innerHTML = devices.map(d => {
        const portsHtml = d.openPorts.length > 0 
            ? d.openPorts.map(p => {
                // پورت‌های خطرناک رنگ قرمز، بقیه آبی
                const color = (p === 3389 || p === 22) ? 'var(--neon-red)' : 'var(--neon-blue)';
                return `<span style="display: inline-block; padding: 2px 8px; margin: 2px; border-radius: 4px; background: rgba(0,212,255,0.1); border: 1px solid ${color}; color: ${color}; font-size: 11px;">${p}</span>`;
            }).join('')
            : '<span style="color: var(--text-muted); font-size: 11px;">هیچ پورتی باز نیست</span>';

        return `
            <tr style="border-bottom: 1px solid var(--border); transition: all 0.2s;" onmouseover="this.style.background='rgba(0,212,255,0.05)'" onmouseout="this.style.background='transparent'">
                <td style="padding: 12px; font-weight: 700; color: var(--neon-blue);">${d.ipAddress}</td>
                <td style="padding: 12px; color: var(--text-primary);">${d.hostName || 'Unknown'}</td>
                <td style="padding: 12px; color: var(--text-muted); font-family: monospace; font-size: 12px; direction: ltr;">${d.macAddress}</td>
                <td style="padding: 12px; color: ${d.responseTime < 10 ? 'var(--neon-green)' : d.responseTime < 50 ? 'var(--neon-yellow)' : 'var(--neon-red)'};">${d.responseTime} ms</td>
                <td style="padding: 12px;">${portsHtml}</td>
                <td style="padding: 12px;">
                    <span style="color: var(--neon-green); background: rgba(0,255,136,0.1); padding: 4px 10px; border-radius: 4px; font-size: 11px;">● آنلاین</span>
                </td>
            </tr>
        `;
    }).join('');
}