# Bestie — React + TypeScript (scaffold)

This repository contains a React + TypeScript scaffold that reimplements the original "Bestie-Klusownicy" demo in a small interactive page.

Files added:

- `package.json`, `tsconfig.json`, `vite.config.ts` — minimal project config
- `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css` — application entry and UI
- `src/types.ts` — basic TS types
- `src/behaviours/*` — TypeScript behaviour modules (placeholders / approximations)

How to run (PowerShell on Windows):

```powershell
cd "c:\Users\Adrian\Desktop\ttmp\Bestie-Klusownicy"
# Install dependencies (one-time)
npm install

# Start dev server
npm run dev
```

Notes:

- The behaviour implementations are intentionally simple approximations so the project runs out-of-the-box. Copy and adapt logic from the original `behaviours/*.js` into the TypeScript modules in `src/behaviours` to match original behaviour precisely.
- If you want to replace the original site files (index.html, script.js), either remove them or adapt the new app to use the same assets.
