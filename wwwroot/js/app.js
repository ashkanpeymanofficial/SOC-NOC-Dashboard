// ==================== بررسی لاگین ====================
const token = localStorage.getItem('soc_token');
const username = localStorage.getItem('soc_user');
const userRole = localStorage.getItem('soc_role');

if (!token) {
    window.location.href = '/login.html';
}

// ==================== ساعت و Uptime ====================
function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('clock');
    if (clockEl) clockEl.textContent = now.toLocaleTimeString('en-GB', { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

let uptimeSeconds = 0;
setInterval(() => {
    uptimeSeconds++;
    const h = String(Math.floor(uptimeSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((uptimeSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(uptimeSeconds % 60).padStart(2, '0');
    const uptimeEl = document.getElementById('uptime');
    if (uptimeEl) uptimeEl.textContent = `${h}:${m}:${s}`;
}, 1000);

// ==================== اطلاعات کاربر و خروج ====================
const currentUserEl = document.getElementById('currentUser');
if (currentUserEl) currentUserEl.textContent = username || '---';

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/login.html';
    });
}

// ==================== صدا ====================
let soundEnabled = true;
let audioCtx = null;

function playCriticalSound() {
    if (!soundEnabled) return;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.2].forEach(delay => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + delay);
        osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + delay + 0.15);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + 0.2);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + 0.2);
    });
}

function playWarningSound() {
    if (!soundEnabled) return;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.3);
}

const soundToggleBtn = document.getElementById('soundToggle');
if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', function() {
        soundEnabled = !soundEnabled;
        this.classList.toggle('muted', !soundEnabled);
    });
}

// ==================== آمار و لاگ‌ها ====================
const stats = { total: 0, critical: 0, warning: 0, info: 0 };
const allLogs = [];
const logContainer = document.getElementById('logContainer');
let currentFilter = 'all';
let currentSearch = '';
let currentSecondCritical = 0;
let currentSecondWarning = 0;

function updateStats(severity) {
    stats.total++;
    const key = severity.toLowerCase();
    if (stats[key] !== undefined) stats[key]++;
    animateNumber('totalEvents', stats.total);
    animateNumber('criticalEvents', stats.critical);
    animateNumber('warningEvents', stats.warning);
    animateNumber('infoEvents', stats.info);
    animateNumber('totalForDonut', stats.total);
    updateDonut();
}

function animateNumber(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const current = parseInt(el.textContent) || 0;
    const diff = target - current;
    if (diff === 0) return;
    const steps = 20; let step = 0;
    const timer = setInterval(() => {
        step++;
        el.textContent = Math.round(current + (diff * step / steps));
        if (step >= steps) { el.textContent = target; clearInterval(timer); }
    }, 20);
}

const CIRCUMFERENCE = 2 * Math.PI * 40;
function updateDonut() {
    const total = stats.total || 1;
    const cLen = (stats.critical / total) * CIRCUMFERENCE;
    const wLen = (stats.warning / total) * CIRCUMFERENCE;
    const iLen = (stats.info / total) * CIRCUMFERENCE;
    
    const dc = document.getElementById('donutCritical');
    const dw = document.getElementById('donutWarning');
    const di = document.getElementById('donutInfo');
    
    if(dc) { dc.style.strokeDasharray = `${cLen} ${CIRCUMFERENCE}`; dc.style.strokeDashoffset = 0; }
    if(dw) { dw.style.strokeDasharray = `${wLen} ${CIRCUMFERENCE}`; dw.style.strokeDashoffset = -cLen; }
    if(di) { di.style.strokeDasharray = `${iLen} ${CIRCUMFERENCE}`; di.style.strokeDashoffset = -(cLen + wLen); }
}

function addLog(log) {
    allLogs.unshift(log);
    if (allLogs.length > 500) allLogs.pop();
    renderLogs();
    updateStats(log.severity);

    if (log.severity === 'Critical') {
        addAlert(log);
        playCriticalSound();
        currentSecondCritical++;
    } else if (log.severity === 'Warning') {
        playWarningSound();
        currentSecondWarning++;
    }
}

function renderLogs() {
    if (!logContainer) return;
    
    const filtered = allLogs.filter(log => {
        const matchFilter = currentFilter === 'all' || log.severity.toLowerCase() === currentFilter;
        const matchSearch = currentSearch === '' || 
            log.message.toLowerCase().includes(currentSearch.toLowerCase()) ||
            log.sourceIp.includes(currentSearch);
        return matchFilter && matchSearch;
    });

    if (filtered.length === 0) {
        logContainer.innerHTML = `<div class="empty-state">${allLogs.length === 0 ? 'در انتظار دریافت رویداد...' : 'هیچ نتیجه‌ای یافت نشد'}</div>`;
        return;
    }

    logContainer.innerHTML = filtered.slice(0, 200).map(log => {
        const time = new Date(log.timestamp).toLocaleTimeString('en-GB', { hour12: false });
        return `
            <div class="log-entry ${log.severity.toLowerCase()}">
                <span class="log-time">${time}</span>
                <span class="log-source">${escapeHtml(log.sourceIp)}</span>
                <span class="log-message">${escapeHtml(log.message)}</span>
            </div>
        `;
    }).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        renderLogs();
    });
}

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderLogs();
    });
});

const alertList = document.getElementById('alertList');
let alertCount = 0;

function addAlert(log) {
    if (!alertList) return;
    if (alertCount === 0) alertList.innerHTML = '';
    alertCount++;
    const div = document.createElement('div');
    div.className = 'alert-item';
    const time = new Date(log.timestamp).toLocaleTimeString('en-GB', { hour12: false });
    div.innerHTML = `
        <div class="alert-icon">⚠</div>
        <div class="alert-content">
            <div class="alert-title">${escapeHtml(log.sourceIp)} <span style="color: var(--text-muted); font-size: 11px;">${time}</span></div>
            <div class="alert-desc">${escapeHtml(log.message.substring(0, 60))}</div>
        </div>
    `;
    alertList.prepend(div);
    if (alertList.children.length > 8) alertList.removeChild(alertList.lastChild);
}

// ==================== نمودار خطی ====================
let trendChart = null;
const chartCanvas = document.getElementById('trendChart');
if (chartCanvas) {
    const chartCtx = chartCanvas.getContext('2d');
    const labels = Array.from({ length: 60 }, (_, i) => `${60 - i}ث`);
    const criticalData = new Array(60).fill(0);
    const warningData = new Array(60).fill(0);

    trendChart = new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'بحرانی', data: criticalData, borderColor: '#ff3355', backgroundColor: 'rgba(255, 51, 85, 0.1)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 0 },
                { label: 'هشدار', data: warningData, borderColor: '#ffcc00', backgroundColor: 'rgba(255, 204, 0, 0.1)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 0 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
            plugins: { legend: { labels: { color: '#e5edff', font: { family: 'Vazirmatn' } } } },
            scales: {
                x: { ticks: { color: '#6b7d9c', font: { size: 9 } }, grid: { color: '#1e2b45' } },
                y: { beginAtZero: true, ticks: { color: '#6b7d9c', stepSize: 1 }, grid: { color: '#1e2b45' } }
            }
        }
    });

    setInterval(() => {
        criticalData.push(currentSecondCritical); criticalData.shift();
        warningData.push(currentSecondWarning); warningData.shift();
        currentSecondCritical = 0; currentSecondWarning = 0;
        trendChart.update('none');
    }, 1000);
}

// ==================== SignalR ====================
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/hubs/security")
    .withAutomaticReconnect()
    .build();

connection.on("ReceiveLog", (log) => addLog(log));

const badge = document.getElementById('connectionBadge');
const badgeText = document.getElementById('connectionText');
const signalrStatus = document.getElementById('signalrStatus');

connection.start()
    .then(() => {
        if (badgeText) badgeText.textContent = 'متصل';
        if (badge) badge.classList.remove('disconnected');
        if (signalrStatus) { signalrStatus.textContent = 'فعال ✅'; signalrStatus.style.color = 'var(--neon-green)'; }
    })
    .catch(() => {
        if (badgeText) badgeText.textContent = 'قطع';
        if (badge) badge.classList.add('disconnected');
        if (signalrStatus) { signalrStatus.textContent = 'قطع ❌'; signalrStatus.style.color = 'var(--neon-red)'; }
    });

connection.onreconnecting(() => { if(badgeText) badgeText.textContent = 'اتصال مجدد...'; if(badge) badge.classList.add('disconnected'); });
connection.onreconnected(() => { if(badgeText) badgeText.textContent = 'متصل'; if(badge) badge.classList.remove('disconnected'); if(signalrStatus) { signalrStatus.textContent = 'فعال ✅'; signalrStatus.style.color = 'var(--neon-green)'; } });


// ==================== همه چیز بعد از لود کامل صفحه ====================
window.addEventListener('load', () => {

    // --- 1. شبیه‌ساز حمله ---
    const attackScenarios = [
        { ip: '185.220.101.45', type: 'DDoS', msg: 'CRITICAL: DDoS Attack detected - Traffic spike 12Gbps on port 443', severity: 'Critical' },
        { ip: '103.75.201.12', type: 'Brute Force', msg: 'CRITICAL: Brute force attack on SSH - 240 failed attempts in 60s', severity: 'Critical' },
        { ip: '45.142.212.61', type: 'SQL Injection', msg: 'CRITICAL: SQL Injection attempt on /api/login - payload detected', severity: 'Critical' },
        { ip: '192.168.1.105', type: 'Port Scan', msg: 'WARNING: Port scan detected from internal host - 150 ports scanned', severity: 'Warning' },
        { ip: '78.46.178.33', type: 'XSS Attempt', msg: 'WARNING: XSS attempt on /search endpoint - script tag detected', severity: 'Warning' },
        { ip: '10.0.0.55', type: 'Failed Login', msg: 'WARNING: 5 failed login attempts for user admin', severity: 'Warning' },
        { ip: '203.0.113.42', type: 'Malware Signature', msg: 'CRITICAL: Malware signature detected - Trojan.Win32.Generic', severity: 'Critical' },
        { ip: '198.51.100.7', type: 'Suspicious Traffic', msg: 'WARNING: Unusual outbound traffic to unknown IP - 500MB transferred', severity: 'Warning' },
        { ip: '172.16.0.88', type: 'ARP Spoofing', msg: 'CRITICAL: ARP spoofing detected - MAC address mismatch on gateway', severity: 'Critical' },
        { ip: '8.8.4.4', type: 'DNS Query', msg: 'INFO: DNS query to suspicious domain malware-c2.xyz', severity: 'Info' },
        { ip: '52.14.99.11', type: 'Configuration Change', msg: 'INFO: Firewall rule modified by admin - rule #45 disabled', severity: 'Info' },
        { ip: '91.240.118.172', type: 'Ransomware Attempt', msg: 'CRITICAL: Ransomware behavior detected - mass file encryption attempt', severity: 'Critical' }
    ];

    let demoInterval = null;
    const demoBtn = document.getElementById('demoBtn');
    
    if (demoBtn) {
        demoBtn.addEventListener('click', function() {
            if (demoInterval) {
                clearInterval(demoInterval); demoInterval = null;
                demoBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg><span style="font-family: 'Vazirmatn', sans-serif; font-weight: 500;">شبیه‌سازی حمله</span>`;
                demoBtn.style.borderColor = 'rgba(255, 204, 0, 0.4)'; demoBtn.style.color = 'var(--neon-yellow)';
                return;
            }
            demoBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg><span style="font-family: 'Vazirmatn', sans-serif; font-weight: 500;">توقف شبیه‌سازی</span>`;
            demoBtn.style.borderColor = 'rgba(255, 51, 85, 0.6)'; demoBtn.style.color = 'var(--neon-red)';
            sendFakeAttack();
            demoInterval = setInterval(sendFakeAttack, 2000);
        });

        async function sendFakeAttack() {
            const scenario = attackScenarios[Math.floor(Math.random() * attackScenarios.length)];
            try {
                await fetch('/api/simulate/attack', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(scenario)
                });
            } catch (err) { console.error('خطا:', err); }
        }
    }

    // --- 2. مودال اسکن فایل ---
    const scanModal = document.getElementById('scanModal');
    const scanFileBtn = document.getElementById('scanFileBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalUploadBox = document.getElementById('modalUploadBox');
    const modalFileInput = document.getElementById('modalFileInput');
    const modalFileName = document.getElementById('modalFileName');
    const modalScanBtn = document.getElementById('modalScanBtn');
    const modalResultBox = document.getElementById('modalResultBox');
    let modalSelectedFile = null;

    if (scanFileBtn) {
        scanFileBtn.addEventListener('click', () => {
            scanModal.style.display = 'flex';
            modalSelectedFile = null;
            modalFileName.textContent = 'هیچ فایلی انتخاب نشده';
            modalFileName.style.color = 'var(--text-muted)';
            modalScanBtn.style.display = 'none';
            modalResultBox.style.display = 'none';
        });
    }
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => { scanModal.style.display = 'none'; });
    
    if (modalUploadBox) {
        modalUploadBox.addEventListener('click', () => modalFileInput.click());
        modalFileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                modalSelectedFile = e.target.files[0];
                modalFileName.textContent = `${modalSelectedFile.name} (${(modalSelectedFile.size / 1024).toFixed(1)} KB)`;
                modalFileName.style.color = 'var(--neon-green)';
                modalScanBtn.style.display = 'flex';
                modalResultBox.style.display = 'none';
            }
        });
    }

    if (modalScanBtn) {
        modalScanBtn.addEventListener('click', async () => {
            if (!modalSelectedFile) return;
            modalScanBtn.innerHTML = '⏳ در حال اسکن...';
            modalScanBtn.disabled = true;
            modalResultBox.style.display = 'none';

            const isDemoMode = document.getElementById('modalDemoMode').checked;
            const formData = new FormData();
            formData.append('file', modalSelectedFile);

            try {
                const response = await fetch('/api/filescan/upload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'X-Demo-Mode': isDemoMode ? 'true' : 'false' },
                    body: formData
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'خطا در اسکن');
                
                modalResultBox.style.display = 'block';
                if (data.isMalware) {
                    modalResultBox.innerHTML = `<div style="background: rgba(255, 51, 85, 0.1); border: 1px solid var(--neon-red); border-radius: 12px; padding: 16px;"><div style="color: var(--neon-red); font-weight: 700; margin-bottom: 8px;">🚨 فایل آلوده است!</div><div style="font-size: 12px; color: var(--text-primary);">مخرب: ${data.malicious} / ${data.total}</div></div>`;
                } else {
                    modalResultBox.innerHTML = `<div style="background: rgba(0, 255, 136, 0.1); border: 1px solid var(--neon-green); border-radius: 12px; padding: 16px;"><div style="color: var(--neon-green); font-weight: 700; margin-bottom: 8px;">✅ فایل تمیز است</div><div style="font-size: 12px; color: var(--text-primary);">مخرب: ${data.malicious} / ${data.total}</div></div>`;
                }
            } catch (err) {
                modalResultBox.style.display = 'block';
                modalResultBox.innerHTML = `<div style="color: var(--neon-red); font-size: 13px;">❌ ${err.message}</div>`;
            } finally {
                modalScanBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> اسکن فایل`;
                modalScanBtn.disabled = false;
            }
        });
    }

    // --- 3. پنل مدیریت کاربران ---
    const usersBtn = document.getElementById('usersBtn');
    const usersModal = document.getElementById('usersModal');
    const closeUsersModalBtn = document.getElementById('closeUsersModalBtn');

    if (userRole === 'Admin' && usersBtn) {
        usersBtn.style.display = 'flex';
        
        usersBtn.addEventListener('click', () => {
            usersModal.style.display = 'flex';
            loadUsers();
        });
    }

    if (closeUsersModalBtn) {
        closeUsersModalBtn.addEventListener('click', () => { usersModal.style.display = 'none'; });
    }

    const createUserBtn = document.getElementById('createUserBtn');
    if (createUserBtn) {
        createUserBtn.addEventListener('click', async () => {
            const uname = document.getElementById('newUsername').value.trim();
            const pass = document.getElementById('newPassword').value;
            const role = document.getElementById('newRole').value;

            if (!uname || pass.length < 8) {
                alert('نام کاربری را وارد کنید و رمز باید حداقل ۸ کاراکتر باشد');
                return;
            }

            createUserBtn.textContent = '...'; createUserBtn.disabled = true;

            try {
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ username: uname, password: pass, role: role })
                });

                // خواندن امن پاسخ (جلوگیری از خطای JSON)
                const text = await response.text();
                if (!text) throw new Error(`سرور پاسخ خالی داد (کد ${response.status}).`);
                const data = JSON.parse(text);
                
                if (!response.ok) throw new Error(data.message);

                document.getElementById('newUsername').value = '';
                document.getElementById('newPassword').value = '';
                loadUsers();
            } catch (err) {
                alert(err.message);
            } finally {
                createUserBtn.textContent = 'ساخت کاربر'; createUserBtn.disabled = false;
            }
        });
    }

    async function loadUsers() {
        try {
            const response = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // خواندن امن پاسخ
            const text = await response.text();
            if (!text) {
                throw new Error(`سرور پاسخ خالی داد (کد ${response.status}). لطفا دیتابیس (soc.db) را پاک کنید.`);
            }
            
            const users = JSON.parse(text);
            if (!response.ok) throw new Error(users.message || 'خطا در دریافت کاربران');
            
            const tbody = document.getElementById('usersTableBody');
            
            tbody.innerHTML = users.map(u => {
                const lastLogin = u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('fa-IR') : 'هرگز';
                const statusBadge = u.isLocked 
                    ? '<span style="color: var(--neon-red); background: rgba(255,51,85,0.1); padding: 4px 8px; border-radius: 4px; font-size: 11px;">🔒 قفل</span>' 
                    : '<span style="color: var(--neon-green); background: rgba(0,255,136,0.1); padding: 4px 8px; border-radius: 4px; font-size: 11px;">✅ فعال</span>';
                
                const roleColor = u.role === 'Admin' ? 'var(--neon-red)' : u.role === 'Analyst' ? 'var(--neon-yellow)' : 'var(--neon-blue)';
                const isAdminUser = u.username === 'admin';
                
                return `
                    <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding: 12px 16px; font-weight: 700;">${u.username}</td>
                        <td style="padding: 12px 16px; color: ${roleColor};">${u.role}</td>
                        <td style="padding: 12px 16px;">${statusBadge}</td>
                        <td style="padding: 12px 16px; color: var(--text-muted);">${lastLogin}</td>
                        <td style="padding: 12px 16px;">
                            ${isAdminUser ? '<span style="color:var(--text-muted);font-size:11px;">سیستم</span>' : `
                                <button onclick="toggleUserLock(${u.id})" style="background: none; border: 1px solid ${u.isLocked ? 'var(--neon-green)' : 'var(--neon-yellow)'}; color: ${u.isLocked ? 'var(--neon-green)' : 'var(--neon-yellow)'}; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 11px; margin-left: 4px;">
                                    ${u.isLocked ? 'آنلاک' : 'قفل'}
                                </button>
                                <button onclick="deleteUser(${u.id})" style="background: none; border: 1px solid var(--neon-red); color: var(--neon-red); padding: 4px 10px; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 11px;">
                                    حذف
                                </button>
                            `}
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            console.error(err);
            document.getElementById('usersTableBody').innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--neon-red);">❌ ${err.message}</td></tr>`;
        }
    }

    window.toggleUserLock = async function(id) {
        try {
            const response = await fetch(`/api/users/${id}/toggle-lock`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message);
            }
            loadUsers();
        } catch (err) {
            alert(err.message);
        }
    };

    window.deleteUser = async function(id) {
        if (!confirm('آیا از حذف این کاربر مطمئن هستید؟')) return;
        try {
            const response = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message);
            }
            loadUsers();
        } catch (err) {
            alert(err.message);
        }
    };

});