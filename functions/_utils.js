const DANMAKU_KEEP = 200;
const RATE_SECONDS = 8;
const VERSION_KEEP = 10;
const VERSION_TTL = 90 * 24 * 60 * 60;
const LOGIN_WINDOW_SECONDS = 10 * 60;
const LOGIN_MAX_FAILURES = 5;
const BLOCKED = [/https?:\/\//i, /<script/i, /\b(fuck|shit|bitch)\b/i, /加微信/, /免费领取/];
const PROJECT_TINTS = new Set(["violet", "cyan", "amber", "rose", "gold", "blue", "green"]);
const PROJECT_STATUSES = new Set(["live", "hidden"]);

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
    items: items.map((item) => {
      const slug = String(item.slug || "").trim();
      return {
        id: clip(item.id, 40) || `n_${Date.now()}`,
        title: cleanText(item.title, 80) || "未命名",
        body: cleanText(item.body, 4000),
        createdAt: item.createdAt || new Date().toISOString(),
        ...( /^[a-z0-9-]{1,80}$/.test(slug) ? { slug } : {}),
      };
    }),
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

export function assertNow(payload) {
  return {
    text: cleanText(payload?.text, 80),
    updatedAt: new Date().toISOString(),
  };
}

function safeHttpUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "";
  } catch (error) {
    return "";
  }
}

function safeShot(value) {
  const shot = String(value || "").trim().replace(/^\/+/, "");
  if (/^assets\/shots\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i.test(shot)) return shot;
  if (/^api\/project-shot\/[a-z0-9-]{1,60}$/i.test(shot)) return shot;
  return "";
}

export function assertProjects(payload) {
  const projects = Array.isArray(payload?.projects) ? payload.projects.slice(0, 30) : [];
  return projects.map((project, index) => {
    const rawId = String(project.id || "").trim().toLowerCase();
    const id = /^[a-z0-9-]{1,60}$/.test(rawId) ? rawId : `project-${Date.now()}-${index}`;
    const github = safeHttpUrl(project.github);
    const rawUpdatedAt = String(project.updatedAt || "");
    const updatedAt = Number.isNaN(Date.parse(rawUpdatedAt)) ? "" : rawUpdatedAt;
    return {
      id,
      icon: /^[a-z0-9-]{1,30}$/i.test(project.icon || "") ? project.icon : "chart",
      tint: PROJECT_TINTS.has(project.tint) ? project.tint : "blue",
      name: cleanText(project.name, 60) || "未命名项目",
      tag: cleanText(project.tag, 24) || "项目",
      summary: cleanText(project.summary, 500),
      live: safeHttpUrl(project.live),
      ...(github ? { github } : {}),
      ...(project.githubPublic === false ? { githubPublic: false } : {}),
      shot: safeShot(project.shot),
      status: PROJECT_STATUSES.has(project.status) ? project.status : "live",
      ...(updatedAt ? { updatedAt } : {}),
    };
  });
}

export function assertProjectShot(payload) {
  const projectId = String(payload?.projectId || "").trim().toLowerCase();
  if (!/^[a-z0-9-]{1,60}$/.test(projectId)) {
    throw Object.assign(new Error("项目 ID 不正确"), { status: 400 });
  }
  const match = String(payload?.dataUrl || "").match(/^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=]+)$/i);
  if (!match) throw Object.assign(new Error("只支持 JPG、PNG 或 WebP 截图"), { status: 400 });
  if (match[2].length > 2_800_000) throw Object.assign(new Error("截图不能超过 2 MB"), { status: 413 });
  return { projectId, mime: match[1].toLowerCase(), base64: match[2] };
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

export async function writeStoreVersioned(env, key, data) {
  if (!env.HUB_KV) {
    throw Object.assign(new Error("未绑定 HUB_KV，无法持久化。在 Cloudflare Pages 给这个项目绑一个 KV，名称填 HUB_KV。"), { status: 503 });
  }
  const previous = await env.HUB_KV.get(key);
  if (previous) {
    const createdAt = new Date().toISOString();
    const backupKey = `backup:${key}:${Date.now()}`;
    const historyKey = `history:${key}`;
    let history = [];
    try {
      history = JSON.parse((await env.HUB_KV.get(historyKey)) || "[]");
    } catch (error) {}
    const next = [{ key: backupKey, createdAt }, ...history].slice(0, VERSION_KEEP);
    const expired = history.slice(VERSION_KEEP - 1);
    await Promise.all([
      env.HUB_KV.put(backupKey, previous, { expirationTtl: VERSION_TTL }),
      env.HUB_KV.put(historyKey, JSON.stringify(next)),
      ...expired.map((item) => env.HUB_KV.delete(item.key)),
    ]);
  }
  await env.HUB_KV.put(key, JSON.stringify(data));
}

export async function restoreStoreVersion(env, key) {
  if (!env.HUB_KV) throw Object.assign(new Error("未绑定 HUB_KV"), { status: 503 });
  let history = [];
  try {
    history = JSON.parse((await env.HUB_KV.get(`history:${key}`)) || "[]");
  } catch (error) {}
  const latest = history[0];
  if (!latest) throw Object.assign(new Error("还没有可恢复的历史版本"), { status: 404 });
  const raw = await env.HUB_KV.get(latest.key);
  if (!raw) throw Object.assign(new Error("这个历史版本已经过期"), { status: 404 });
  const data = JSON.parse(raw);
  await writeStoreVersioned(env, key, data);
  return data;
}

export async function readStaticStore(request, path, fallback) {
  try {
    const response = await fetch(new URL(path, request.url));
    if (response.ok) return await response.json();
  } catch (error) {}
  return fallback;
}

function loginKey(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  return `login:${ip}`;
}

export async function loginBlocked(env, request) {
  if (!env.HUB_KV) return false;
  try {
    const state = JSON.parse((await env.HUB_KV.get(loginKey(request))) || "{}");
    return Number(state.failures || 0) >= LOGIN_MAX_FAILURES;
  } catch (error) {
    return false;
  }
}

export async function recordLoginFailure(env, request) {
  if (!env.HUB_KV) return;
  let failures = 0;
  try {
    const state = JSON.parse((await env.HUB_KV.get(loginKey(request))) || "{}");
    failures = Number(state.failures || 0);
  } catch (error) {}
  await env.HUB_KV.put(loginKey(request), JSON.stringify({ failures: failures + 1 }), {
    expirationTtl: LOGIN_WINDOW_SECONDS,
  });
}

export async function clearLoginFailures(env, request) {
  if (env.HUB_KV) await env.HUB_KV.delete(loginKey(request));
}

export async function rateLimited(env, request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (env.HUB_KV) {
    const key = `rate:${ip}`;
    const last = Number((await env.HUB_KV.get(key)) || 0);
    const now = Date.now();
    if (last && now - last < RATE_SECONDS * 1000) return true;
    // KV 的 expirationTtl 最小为 60 秒，故改存时间戳来实现更短的限流窗口
    await env.HUB_KV.put(key, String(now), { expirationTtl: 60 });
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
