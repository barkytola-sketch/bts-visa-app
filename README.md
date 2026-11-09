# BTS Visa News Telegram Mini App

A starter Telegram Web App with:
- News feed, categories and keyword search
- Free articles and locked premium article cards
- Gemini-powered question assistant
- Manual payment-reference request form (not an automatic payment gateway)
- Admin API for publishing news
- Cloudflare Worker backend and static frontend

## Important API-key security

The API key you pasted into chat must be considered exposed. Revoke it in Google AI Studio and create a new key. **Do not put the key in this repository, HTML, JavaScript, GitHub, or Telegram.** Add it as a Cloudflare Worker secret named `GEMINI_API_KEY`.

## 1. Upload to GitHub

1. Create a new GitHub repository named `bts-visa-telegram-miniapp`.
2. Upload all files and folders from this project.
3. Do not upload `.dev.vars` or any real secret.

## 2. Create Cloudflare KV

1. In Cloudflare, open Workers & Pages → KV.
2. Create a namespace named `BTS_DATA`.
3. Copy its namespace ID.
4. Open `wrangler.toml` and replace `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`.

## 3. Deploy from GitHub

1. In Cloudflare, open Workers & Pages → Create → Connect to Git.
2. Select your GitHub repository.
3. Use the Wrangler configuration in this repository (`wrangler.toml`).
4. Deploy.

If your Cloudflare setup asks for a build command, use `npm install`; the Worker is deployed with Wrangler. You can also deploy from a terminal using `npm install` then `npx wrangler deploy`.

## 4. Add Cloudflare secrets

In the Worker → Settings → Variables and Secrets, add these as **Secrets**:
- `GEMINI_API_KEY` = your newly generated Google AI Studio key
- `BOT_TOKEN` = token from BotFather for your Telegram bot
- `ADMIN_TOKEN` = a long random password only you know

Never put secret values in GitHub files.

## 5. Connect the Mini App to Telegram

1. Open @BotFather.
2. Choose your bot → Bot Settings → Configure Mini App (or the Web App/menu button option available in BotFather).
3. Set the deployed HTTPS Worker URL as the Mini App URL.
4. Set a menu button label such as `Open BTS News`.
5. Open the bot in Telegram and launch the Mini App.

The backend checks Telegram `initData` using `BOT_TOKEN`. The AI and payment-request endpoints will reject requests that do not come from a valid Telegram Mini App session.

## 6. Publish a news post

Send a POST request to `https://YOUR-WORKER-URL/api/admin/news` with:
- Header: `Authorization: Bearer YOUR_ADMIN_TOKEN`
- Header: `Content-Type: application/json`
- JSON body, for example:

```json
{
  "title": "New study visa update",
  "summary": "Short summary of the update.",
  "body": "Full article text. Include the official source and publication date.",
  "category": "Study Visa",
  "free": true
}
```

Set `free` to `false` for a locked article. Use a secure API client; never expose `ADMIN_TOKEN` in the website.

## 7. Test

- Open `https://YOUR-WORKER-URL/api/health` and confirm it returns `{"ok":true,...}`.
- Open the Mini App from Telegram, not directly in a normal browser.
- Test free news, search and the AI assistant.

## Important limitations before public launch

- Payment requests are **manual review only**. This code does not charge a card, verify bank transfers, process PayPal payments, or automatically unlock premium content.
- Premium unlock/subscription entitlement and admin approval screens still need to be added before selling access.
- News is not automatically collected or published 24/7 in this starter. An editor must verify sources and publish through the admin API.
- The initial news items are demonstration content. Replace them with verified news and official links.
- Add a privacy policy, terms, support contact, and secure admin publishing interface before public launch.
