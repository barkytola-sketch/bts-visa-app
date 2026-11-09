const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type, authorization",
      "access-control-allow-methods": "GET, POST, OPTIONS" }
  });

async function verifyTelegramInitData(initData, botToken) {
  if (!botToken) return false;
  const params = new URLSearchParams(initData || "");
  const hash = params.get("hash");
  if (!hash) return false;
  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`).join("\n");

  const enc = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    "raw", enc.encode(botToken), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const secret = await crypto.subtle.sign("HMAC", enc.encode("WebAppData"), secretKey);
  const key = await crypto.subtle.importKey(
    "raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(dataCheckString));
  const calculated = [...new Uint8Array(signature)].map(b => b.toString(16).padStart(2, "0")).join("");
  return calculated === hash;
}

async function requireTelegram(request, env) {
  // Production: set BOT_TOKEN and require valid Telegram WebApp initData.
  const initData = request.headers.get("X-Telegram-Init-Data") || "";
  if (!env.BOT_TOKEN) return { ok: false, error: "BOT_TOKEN is not configured." };
  const ok = await verifyTelegramInitData(initData, env.BOT_TOKEN);
  return ok ? { ok: true } : { ok: false, error: "Open this app from your Telegram bot." };
}

const seedNews = [
  { id: "welcome-1", title: "Welcome to BTS Visa News", summary: "Visa, study, work and travel updates in one place.", category: "General", date: new Date().toISOString(), free: true, body: "Welcome! Check official embassy and immigration sources before making decisions." },
  { id: "travel-1", title: "Travel preparation checklist", summary: "Keep your passport, confirmed bookings and required travel documents ready.", category: "Travel", date: new Date().toISOString(), free: true, body: "Check entry rules with the destination country's official government website before travelling." },
  { id: "premium-1", title: "Premium visa guide sample", summary: "A sample locked guide. Subscribe or request access to read full details.", category: "Study Visa", date: new Date().toISOString(), free: false, body: "Premium article sample content. Replace this with verified, editorially reviewed content." }
];

async function getNews(env) {
  const stored = await env.BTS_DATA.get("news", "json");
  return Array.isArray(stored) && stored.length ? stored : seedNews;
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (url.pathname === "/api/health") return json({ ok: true, service: "BTS Visa News API" });

  if (url.pathname === "/api/news" && request.method === "GET") {
    const q = (url.searchParams.get("q") || "").toLowerCase();
    const category = url.searchParams.get("category") || "All";
    const all = await getNews(env);
    const filtered = all.filter(n =>
      (category === "All" || n.category === category) &&
      (!q || `${n.title} ${n.summary} ${n.category}`.toLowerCase().includes(q))
    );
    return json({ news: filtered.map(({ body, ...item }) => item) });
  }

  if (url.pathname === "/api/article" && request.method === "GET") {
    const id = url.searchParams.get("id");
    const item = (await getNews(env)).find(n => n.id === id);
    if (!item) return json({ error: "Article not found." }, 404);
    if (!item.free) return json({ error: "This article is for subscribers. Request access to unlock it." }, 402);
    return json({ article: item });
  }

  if (url.pathname === "/api/ask" && request.method === "POST") {
    const auth = await requireTelegram(request, env);
    if (!auth.ok) return json({ error: auth.error }, 401);
    if (!env.GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY secret is not configured." }, 503);
    const body = await request.json().catch(() => ({}));
    const question = String(body.question || "").trim().slice(0, 1500);
    if (!question) return json({ error: "Write a question first." }, 400);
    const prompt = `You are the BTS Visa News information assistant. Answer clearly and cautiously. Visa rules change; do not invent requirements, fees, dates, or guarantees. Encourage users to verify details with the relevant official embassy or immigration website. This is general information, not legal advice.\n\nUser question: ${question}`;
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(env.GEMINI_API_KEY),
      { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return json({ error: result.error?.message || "Gemini request failed." }, 502);
    const answer = result.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("\n") || "No answer returned.";
    return json({ answer });
  }

  if (url.pathname === "/api/payment-request" && request.method === "POST") {
    const auth = await requireTelegram(request, env);
    if (!auth.ok) return json({ error: auth.error }, 401);
    const body = await request.json().catch(() => ({}));
    const method = String(body.method || "").slice(0, 40);
    const reference = String(body.reference || "").slice(0, 100);
    if (!method || !reference) return json({ error: "Enter payment method and transaction/reference details." }, 400);
    const id = crypto.randomUUID();
    const requests = await env.BTS_DATA.get("payment_requests", "json") || [];
    requests.push({ id, method, reference, status: "pending", createdAt: new Date().toISOString() });
    await env.BTS_DATA.put("payment_requests", JSON.stringify(requests));
    return json({ ok: true, message: "Your request was submitted for manual review.", id });
  }

  if (url.pathname === "/api/admin/news" && request.method === "POST") {
    if (!env.ADMIN_TOKEN || request.headers.get("Authorization") !== `Bearer ${env.ADMIN_TOKEN}`)
      return json({ error: "Unauthorized." }, 401);
    const body = await request.json().catch(() => ({}));
    if (!body.title || !body.summary || !body.body || !body.category)
      return json({ error: "title, summary, body and category are required." }, 400);
    const news = await getNews(env);
    const item = { id: crypto.randomUUID(), title: String(body.title).slice(0, 180),
      summary: String(body.summary).slice(0, 400), body: String(body.body).slice(0, 12000),
      category: String(body.category).slice(0, 40), free: body.free === true,
      date: new Date().toISOString() };
    news.unshift(item);
    await env.BTS_DATA.put("news", JSON.stringify(news.slice(0, 300)));
    return json({ ok: true, article: item });
  }

  return json({ error: "API route not found." }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  }
};