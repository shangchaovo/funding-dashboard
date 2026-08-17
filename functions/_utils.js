const DANMAKU_KEEP = 200;
const RATE_MS = 8;
const BLOCKED = [/https?:\/\//i, /<script/i, /\b(fuck|shit|bitch)\b/i, /加微信/, /免费领取/];

export { DANMAKU_KEEP };

export function json(status, payload, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function clip(value, max) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanText(value, max) {
  return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

function blocked(value) {
  return BLOCKED.some((rule) => rule.test(value));
}

export function assertDanmaku({ nick, text }) {
  const safeNick = clip(nick, 12);
  const safeText = clip(text, 36);
  if (!safeText) throw Object.assign(new Error("先写点什么再发"), { status: 400 });
  if (blocked(safeText) || blocked(safeNick)) {
    throw Object.assign(new Error("这条发不出去，换个说法试试"), { status: 400 });
  }
  return { nick: safeNick, text: safeText };
}

export function assertNotes(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (items.length > 100) throw Object.assign(new Error("观点太多了"), { status: 400 });
  return {
    updatedAt: new Date().toISOString(),
    items: items.map((item) => ({
      id: clip(item.id, 40) || `n_${Date.now()}`,
      title: cleanText(item.title, 80) || "未命名",
      body: cleanText(item.body, 4000),
      createdAt: item.createdAt || new Date().toISOString(),
    })),
  };
}

export function assertWatchlist(payload) {
  const sectors = Array.isArray(payload?.sectors) ? payload.sectors.slice(0, 20) : [];
  return {
    disclaimer: cleanText(payload?.disclaimer, 200) || "个人记录，不是投资建议。",
    updatedAt: new Date().toISOString(),
    sectors: sectors.map((sector) => ({
      id: clip(sector.id, 40) || `s_${Date.now()}`,
      name: cleanText(sector.name, 40) || "未命名板块",
      thesis: cleanText(sector.thesis, 800),
      stocks: Array.isArray(sector.stocks) ? sector.stocks.slice(0, 30).map((stock) => ({
        id: clip(stock.id, 40) || `k_${Date.now()}`,
        symbol: clip(String(stock.symbol || "").toUpperCase(), 12),
        name: cleanText(stock.name, 40),
        reason: cleanText(stock.reason, 800),
      })) : [],
    })),
  };
}

export function adminSecret(env) {
  return String(env.HUB_ADMIN_TOKEN || "").trim();
}

async function hmacHex(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const buffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeEqual(left, right) {
  const a = String(left);
  const b = String(right);
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function signSession(secret) {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const nonce = [...crypto.getRandomValues(new Uint8Array(16))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const payload = `v1.${exp}.${nonce}`;
  const mac = await hmacHex(secret, payload);
  return `${payload}.${mac}`;
}

export async function verifySession(secret, value) {
  if (!secret || !value) return false;
  const parts = String(value).split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return false;
  const [version, exp, nonce, mac] = parts;
  if (Date.now() > Number(exp)) return false;
  const expected = await hmacHex(secret, `${version}.${exp}.${nonce}`);
  return safeEqual(mac, expected);
}

export function readCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return "";
}

export function cookieHeader(value, request) {
  const secure = new URL(request.url).protocol === "https:";
  const bits = [`HubSession=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=604800"];
  if (secure) bits.push("Secure");
  return bits.join("; ");
}

export function clearCookie(request) {
  const secure = new URL(request.url).protocol === "https:";
  const bits = ["HubSession=", "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) bits.push("Secure");
  return bits.join("; ");
}

export async function isAdmin(request, env) {
  return verifySession(adminSecret(env), readCookie(request, "HubSession"));
}

export async function readStore(env, request, key, staticPath, fallback) {
  if (env.HUB_KV) {
    const raw = await env.HUB_KV.get(key);
    if (raw) return JSON.parse(raw);
  }
  try {
    const response = await fetch(new URL(staticPath, request.url));
    if (response.ok) return await response.json();
  } catch (error) {}
  return fallback;
}

export async function writeStore(env, key, data) {
  if (!env.HUB_KV) {
    throw Object.assign(new Error("未绑定 HUB_KV，无法持久化。在 Cloudflare Pages 给这个项目绑一个 KV，名称填 HUB_KV。"), { status: 503 });
  }
  await env.HUB_KV.put(key, JSON.stringify(data));
}

export async function rateLimited(env, request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (env.HUB_KV) {
    const key = `rate:${ip}`;
    const hit = await env.HUB_KV.get(key);
    if (hit) return true;
    await env.HUB_KV.put(key, "1", { expirationTtl: RATE_MS });
    return false;
  }
  return false;
}

export function randomId(prefix) {
  const bytes = [...crypto.getRandomValues(new Uint8Array(6))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${bytes}`;
}

export async function tokenOk(given, secret) {
  const encode = (value) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value)));
  const [left, right] = await Promise.all([encode(given), encode(secret)]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let out = 0;
  for (let i = 0; i < a.length; i += 1) out |= a[i] ^ b[i];
  return out === 0;
}
