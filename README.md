# CAT Live Tracker

CAT Live Tracker is a local-network web app for running a CAT-style multiple-choice and numeric-answer test. Students answer on their phones or computers, while an admin dashboard updates live with total and section marks, answer status, and participant comparisons.

The project has two parts:

- `client/`: React and Vite student page and admin dashboard.
- `server/`: Node.js, Express, and Socket.IO backend for live answers and scoring.

## Features

- One section at a time on mobile; a compact all-questions view for wider screens.
- Section-local question numbers, with a continuous overall number where applicable.
- MCQ and TITA/numeric answers, saved in the student's browser and sent live to the server.
- Live admin ranking with total and section-level marks, correctness counts, and answer comparisons.
- Dark mode on the student and admin pages.
- Configurable section names, answer groups, numbering style, and display order.

## Requirements

- Node.js and npm
- A trusted Wi-Fi/LAN that allows the phone to reach the computer running the app

## Start the app

Open two terminals at the project root. Install packages once in each folder, then leave both processes running while testing.

In terminal 1, start the backend:

```powershell
cd server
npm install
node index.js
```

The server listens on port `3001`. On later runs, skip `npm install` and run `node index.js` from `server/`.

In terminal 2, start the frontend for LAN access:

```powershell
cd client
npm install
npm run dev -- --host 0.0.0.0
```

On later runs, skip `npm install`. Use the **Network** URL printed by Vite. The default is often port `5173`; if it is busy, Vite chooses another port. Do not start duplicate servers on an already-used port (`EADDRINUSE`).

## Open the pages

- Student page: open the Vite URL printed in the frontend terminal.
- Admin dashboard: add `?admin` to that URL, for example `http://192.168.1.20:5173/?admin`.
- Phone: open the same Vite **Network** URL while connected to the same local network as the computer. Use the computer's Wi-Fi IPv4 address, not `localhost` or a `169.254.x.x` link-local address.

The admin page has no password protection. Only use it on a trusted network. The server keeps the live participant list in memory, so restarting it clears that list; student answers are also saved in each browser for session restoration.

## Wi-Fi and Windows Firewall

For a trusted home Wi-Fi, set the Windows network profile to **Private**:

1. Open **Settings > Privacy & security > Windoes Security > Firewall & network protection > Prive network (active) > Toggel Microsoft Defender Firewall off**.
2. Open **Settings >Network & internet > Wi-fi > Airetel_Flat properties > Network Profile type > switch the radio button to public then private again (this step is to refresh the network setting, make sure u keep it on private at the end you just need to switch the Network Profile type thats it)**.

A safer long-term option is to leave the firewall enabled and allow **Node.js JavaScript Runtime** through Windows Firewall on **Private networks** only. This permits the app's frontend and backend connections without disabling the firewall.

## Answer-key format

The active key is `server/answerKey.json`. Answers are grouped by section and numbered locally inside each group. `_config.sectionOrder` controls display order; changing that array does not move the answers. `numbering` can be `restart` or `continuous`. Keep `legacyQuestionOrder` unchanged when changing display order if older saved sessions still need to be mapped.

Example:

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
      "2": { "type": "TITA", "correct": 42 }
    },
    "DILR": {
      "1": { "type": "MCQ", "correct": "B" }
    },
    "QUANT": {
      "1": { "type": "TITA", "correct": 30 }
    }
  }
}
```

Companion answer keys for papers in `Question papers/` are reference files. To run one, place its contents in `server/answerKey.json` and restart the backend.

## Scoring

- MCQ correct: `+3`; incorrect: `-1`.
- TITA correct: `+3`; incorrect: `0`.
- Unanswered: `0`.

## Troubleshooting

- If Vite reports `EADDRINUSE`, use the existing server or stop the old Vite process before starting another.
- If the student page opens but live answers do not update, make sure the backend is running on port `3001` and the phone can reach the computer on the local network.
- If LAN access fails, check the Windows network profile/firewall steps above and disable guest/client isolation on the Wi-Fi router if enabled.

The client can be checked with `npm run lint` and `npm run build` from `client/`.