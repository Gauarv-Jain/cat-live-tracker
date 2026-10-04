# Cat Live Tracker

## Requirements

- Node.js and npm
- Your computer and phone on the same Wi-Fi network for phone access

## Start the app

Open two terminals in the project folder. Install dependencies the first time you run the app.

In terminal 1, start the backend:

```powershell
cd server
node index.js
```

```powershell
cd server
npm install
node index.js
```

The backend listens on port `3001`. Leave this terminal running.

In terminal 2, start the frontend so other devices on your network can reach it:

```powershell
cd client
npm run dev -- --host 0.0.0.0
```

```powershell
cd client
npm install
npm run dev -- --host 0.0.0.0
```

Open the **Network** URL printed by Vite. If port `5173` is already in use, Vite will select another port; use the port shown in its output. Keep this terminal running too.

## Open on a phone

On your phone, open the Vite **Network** URL while connected to the same Wi-Fi as your computer. Do not use `localhost` on the phone; that points to the phone itself. The app connects to the backend on port `3001` using the same computer address as the page.

### Windows network and firewall

For a trusted home Wi-Fi network, set its Windows network profile to **Private**:

1. Open **Settings > Network & internet > Wi-Fi**.
2. Select the connected Wi-Fi network.
3. Under **Network profile type**, select **Private**. Do this only for a network you trust; leave public or guest Wi-Fi set to **Public**.
4. Open **Windows Security > Firewall & network protection > Allow an app through firewall**.
5. Select **Change settings**, find **Node.js JavaScript Runtime**, and allow it on **Private** networks only. If it is not listed, choose **Allow another app** and browse to `C:\Program Files\nodejs\node.exe`.

Keep Windows Firewall enabled. Allowing Node.js on the trusted Private profile is preferable to turning the firewall off. If access still fails, check that the Wi-Fi does not use guest mode or device/AP isolation.

## Pages

- Student page: open the Vite URL as printed.
- Live dashboard: add `?admin` to the URL, for example `http://192.168.1.11:5174/?admin`. Replace the example address and port with Vite's current **Network** URL.

The dashboard is not password-protected. Only share it on a trusted network.

## Configure sections and numbering

Group answers by section under `sections`. Question numbers restart within each section, while `_config.sectionOrder` controls how sections appear:

```json
{
	"_config": {
		"numbering": "restart",
		"sectionOrder": ["VARC", "DILR", "QUANT"],
		"legacyQuestionOrder": ["VARC", "DILR", "QUANT"]
	},
	"sections": {
		"VARC": {
			"1": { "type": "MCQ", "correct": "D" },
			"2": { "type": "MCQ", "correct": "A" }
		},
		"DILR": {
			"1": { "type": "MCQ", "correct": "C" }
		},
		"QUANT": {
			"1": { "type": "TITA", "correct": 30 }
		}
	}
}
```

Change only the names/order in `_config.sectionOrder` to rearrange sections; the answer sets stay attached to their names. Use `"numbering": "restart"` to restart visible numbering in each section or `"numbering": "continuous"` to continue it across sections. Keep `legacyQuestionOrder` unchanged when reordering; it preserves the mapping for answers saved by older versions of the app. This paper uses restarting numbering.

## Troubleshooting

- `EADDRINUSE` means another process is already using that port. If the app is already running, use that instance; otherwise stop the old process with `Ctrl+C` in its terminal and start it again.
- If the page loads but the dashboard does not update, verify that the backend terminal is running and that both devices use the same computer's network address.
- Student and score data is kept in backend memory and is cleared when the backend restarts.
