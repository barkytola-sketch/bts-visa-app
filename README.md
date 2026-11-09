# BTS Visa News — Gemini only

Static Telegram Mini App. No KV, database, Cloudflare Worker backend, payment service, or bot token is included.

## Install
1. Upload `index.html` to your GitHub repository.
2. In GitHub: Settings → Pages → Deploy from a branch → select `main` and `/ (root)` → Save.
3. Wait for GitHub Pages to publish your HTTPS URL.
4. Set that URL as your Telegram Mini App URL in BotFather.
5. Open the Mini App in Telegram, paste your Google AI Studio API key, and tap **Use key**.

## Important
This app calls Gemini directly from the browser. A visitor can inspect the page/network and potentially copy the key. Use a restricted key, monitor quota and usage, and revoke the API key previously pasted in chat. For a public production app, a backend proxy is strongly recommended.

The app uses Gemini `gemini-2.5-flash` with Google Search grounding. Search grounding availability, model access, quotas and browser-origin restrictions depend on Google's current API settings. If direct browser requests are blocked, a backend is required.

AI news is a draft, not automatic publishing. Always check the original official source before posting.
