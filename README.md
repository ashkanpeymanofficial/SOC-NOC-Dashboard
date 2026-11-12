<div align="center">

# 🛡️ SOC Center

**A Modern, Real-Time Security Operations Center (SOC) & Network Operations Center (NOC) Dashboard**

[![.NET](https://img.shields.io/badge/.NET-8.0-512BD4?style=for-the-badge&logo=dotnet)](https://dotnet.microsoft.com/)
[![ASP.NET Core](https://img.shields.io/badge/ASP.NET_Core-Web_API-blue?style=for-the-badge&logo=dotnet)](https://dotnet.microsoft.com/apps/aspnet)
[![SignalR](https://img.shields.io/badge/SignalR-RealTime-red?style=for-the-badge)](https://dotnet.microsoft.com/apps/aspnet/signalr)
[![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

*Built with C#, ASP.NET Core, SignalR, and Vanilla JavaScript.*

</div>

---

## 📖 Overview

**SOC Center** is a comprehensive, full-stack cybersecurity dashboard designed to monitor network activity, detect threats, manage users, and visualize security events in real-time. It combines the functionalities of a **Security Operations Center (SOC)** and a **Network Operations Center (NOC)** into a single, beautifully designed, cyberpunk-themed interface.

Whether you are simulating cyber attacks, monitoring live Syslog traffic, scanning your local network, or analyzing files for malware, SOC Center provides a professional-grade experience.

---

## ✨ Key Features

### 🚨 Security Operations (SOC)
- **Real-time Event Streaming:** Live security logs powered by **SignalR**.
- **Live Analytics:** Interactive charts (Line & Donut) displaying threat severity and trends.
- **Attack Simulator:** One-click simulation of various cyber attacks (DDoS, Brute Force, SQLi, XSS, Ransomware) to test the system.
- **Audio Alerts:** Real-time Web Audio API beeps for critical and warning events.
- **File Scanner (VirusTotal):** Upload files to scan them using the VirusTotal API (includes a Demo mode for safe testing).
- **Syslog Listener:** Built-in UDP listener on port `514` to receive real logs from routers and firewalls.

### 🌐 Network Operations (NOC)
- **Network Scanner:** Discover live devices on your local subnet.
- **Port Scanner:** Scan common open ports (HTTP, SSH, RDP, FTP, etc.) on discovered devices.
- **MAC Address Resolution:** Retrieve MAC addresses via ARP.
- **Device Discovery:** Identify gateways, routers, and connected clients.

### 🔐 Security & User Management
- **JWT Authentication:** Secure login system using JSON Web Tokens.
- **Role-Based Access Control (RBAC):** Three distinct roles: `Admin`, `Analyst`, and `Viewer`.
- **User Management Panel:** Admins can create, delete, and lock/unlock user accounts.
- **Brute-Force Protection:** Accounts are automatically locked after 5 failed login attempts.
- **Structured Logging:** Powered by **Serilog** (Output to Console and daily rolling files).

---

## 🛠️ Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Backend** | C# 12, ASP.NET Core 8, Entity Framework Core |
| **Real-time** | SignalR (WebSockets) |
| **Database** | SQLite |
| **Security** | JWT Bearer, BCrypt.Net-Next |
| **Logging** | Serilog |
| **Frontend** | HTML5, CSS3, Vanilla JS, Chart.js |
| **External APIs** | VirusTotal API v3 |

---

## 🚀 Quick Start

### Prerequisites
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download) or later.
- Visual Studio 2022, VS Code, or any C# IDE.
- A VirusTotal API Key (Optional, for the real file scanner).

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/SOC-Center.git
   cd SOC-Center/SocCenter