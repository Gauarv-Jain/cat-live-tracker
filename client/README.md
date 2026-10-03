# Cat Live Tracker

## Requirements

- Node.js and npm
- Your computer and phone on the same Wi-Fi network for phone access

## Start the app

Open two terminals in the project folder. Install dependencies the first time you run the app.

In terminal 1, start the backend:

```powershell
cd server
npm install
node index.js
```

The backend listens on port `3001`. Leave this terminal running.

In terminal 2, start the frontend so other devices on your network can reach it:

```powershell
cd client
npm install
npm run dev -- --host 0.0.0.0
```

Open the **Network** URL printed by Vite. If port `5173` is already in use, Vite will select another port; use the port shown in its output. Keep this terminal running too.

## Open on a phone

On your phone, open the Vite **Network** URL while connected to the same Wi-Fi as your computer. Do not use `localhost` on the phone; that points to the phone itself. The app connects to the backend on port `3001` using the same computer address as the page.

If the phone cannot load the page, allow Node.js through Windows Firewall on private networks. Guest Wi-Fi networks may block devices from connecting to each other.

## Pages

- Student page: open the Vite URL as printed.
- Live dashboard: add `?admin` to the URL, for example `http://192.168.1.11:5174/?admin`. Replace the example address and port with Vite's current **Network** URL.

The dashboard is not password-protected. Only share it on a trusted network.

## Troubleshooting

- `EADDRINUSE` means another process is already using that port. If the app is already running, use that instance; otherwise stop the old process with `Ctrl+C` in its terminal and start it again.
- If the page loads but the dashboard does not update, verify that the backend terminal is running and that both devices use the same computer's network address.
- Student and score data is kept in backend memory and is cleared when the backend restarts.
