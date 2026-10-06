# 🌐 Complete Dev Tunnel & Vite Setup Guide

This guide covers everything from the initial installation of the Microsoft Dev Tunnel CLI to configuring **Vite v8.0.11** to dynamically bind to your changing local IP address, and automating everything for a **permanent public HTTPS link** every time you start your project.

---

## ⏬ Step 1: Pre-Installation & Verification
Before you can log in, you must install the Dev Tunnel CLI on your machine and locate its binary path.

1. **Open PowerShell as Administrator:**
   - Click the Windows **Start Menu**.
   - Type **PowerShell**.
   - Right-click **Windows PowerShell** and select **Run as administrator**.

2. **Install the Dev Tunnel CLI:**
   Run the official Microsoft installation command via the Windows Package Manager (WinGet):
   ```powershell
   winget install Microsoft.DevTunnel
   ```
   *(If WinGet asks you to agree to source agreements, type `Y` and press Enter.)*

3. **Verify the Installation Path:**
   Open a standard terminal window and run:
   ```cmd
   where devtunnel
   ```
   Note down the outputted path. It will look similar to this:
   `C:\Users\jaing\AppData\Local\Microsoft\WinGet\Packages\Microsoft.devtunnel_Microsoft.Winget.Source_8wekyb3d8bbwe\devtunnel.exe`

---

## 🛠️ Step 2: Configure Vite (`vite.config.js`)
Ensure Vite automatically finds your active network IP instead of crashing when your router changes it.

1. Open **`vite.config.js`** (or `vite.config.ts`).
2. Update the `server` block to look exactly like this:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,         // Allows Vite to listen on your active local network IP
    port: 5173,         // Locks the port to 5173
    strictPort: true,   // Prevents Vite from automatically changing ports if busy
    allowedHosts: true  // Prevents "Invalid Host Header" blocks from the tunnel
  }
})
```

---

## 🔑 Step 3: Authenticate & Create the Permanent Tunnel
Run these commands **once** in your terminal to register a permanent address tied to your account.

1. **Log in** to your GitHub or Microsoft account:
   ```bash
   devtunnel user login
   ```
2. **Create a persistent tunnel** named `cat-tracker` that allows anonymous connections (so your phone can load it without logging in):
   ```bash
   devtunnel create cat-tracker --allow-anonymous
   ```
3. **Link your Vite port (5173)** to this named tunnel permanently:
   ```bash
   devtunnel port create cat-tracker -p 5173
   ```

---

## 🤖 Step 4: Automate Everything via `package.json`
We will combine the front-end server and the tunnel so they launch together seamlessly.

1. Install `concurrently` to run multiple commands at the same time:
   ```bash
   npm install concurrently --save-dev
   ```
2. Open your **`package.json`** file and update the `scripts` section to use the absolute path of your Windows WinGet installation (with double backslashes for JSON escaping):

```json
"scripts": {
  "dev": "concurrently \"vite\" \"\\\"C:\\\\Users\\\\jaing\\\\AppData\\\\Local\\Microsoft\\WinGet\\Packages\\Microsoft.devtunnel_Microsoft.Winget.Source_8wekyb3d8bbwe\\\\devtunnel.exe\\\" host cat-tracker\""
}
```

---

## 🚀 Step 5: Running and Accessing Your Project
From now on, starting your environment is simple. Run this command in your project terminal:

```bash
npm run dev
```

### 🔗 Available URLs:
* **Testing on your computer:** Use `http://localhost:5173/`
* **Testing on your Home Wi-Fi network:** Use the printed `Network:` IP (e.g., `http://192.168.1.10:5173/`)
* **Testing from anywhere in the world (Cellular Data):** Use the permanent public HTTPS URL printed by the devtunnel process (e.g., `https://cat-tracker-5173.inc1.devtunnels.ms`). This link will never change!
