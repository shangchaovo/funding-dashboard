const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const rules = require("./shared/rules");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8777);

function loadEnv() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === "") process.env[key] = value;
  }
}

loadEnv();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

const STATIC_ROOTS = new Set(["css", "js", "data", "assets"]);
const rates = new Map();

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(body);
}

function sendJson(res, status, payload, extra = {}) {
  send(res, status, JSON.stringify(payload), {
    "Content-Type": "application/json; charset=utf-8",
    ...extra,
  });
}

function readJson(name, fallback) {
  const file = path.join(ROOT, "data", name);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function writeJson(name, data) {
  const file = path.join(ROOT, "data", name);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(tmp, file);
}

function adminSecret() {
  return String(process.env.HUB_ADMIN_TOKEN || "").trim();
}

function signSession(secret) {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = `v1.${exp}.${nonce}`;
  const mac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

function tokenOk(given, secret) {
  const a = crypto.createHash("sha256").update(String(given)).digest();
  const b = crypto.createHash("sha256").update(String(secret)).digest();
  return crypto.timingSafeEqual(a, b);
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function verifySession(secret, value) {
  if (!secret || !value) return false;
  const parts = String(value).split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return false;
  const [version, exp, nonce, mac] = parts;
  if (Date.now() > Number(exp)) return false;
  const payload = `${version}.${exp}.${nonce}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return safeEqual(mac, expected);
}

function parseCookies(header) {
  const out = {};
  for (const part of String(header || "").split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

function isAdmin(req) {
  const cookies = parseCookies(req.headers.cookie);
  return verifySession(adminSecret(), cookies.HubSession);
}

function cookieHeader(value, secure) {
  const bits = ["HubSession=" + encodeURIComponent(value), "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=604800"];
  if (secure) bits.push("Secure");
  return bits.join("; ");
}

function clearCookie(secure) {
  const bits = ["HubSession=", "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) bits.push("Secure");
  return bits.join("; ");
}

function clientIp(req) {
  if (process.env.TRUST_PROXY === "1") {
    const forwarded = String(req.headers["x-forwarded-for"] || "");
    const parts = forwarded.split(",").map((item) => item.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return req.socket.remoteAddress || "unknown";
}

function limited(ip) {
  const now = Date.now();
  const last = rates.get(ip) || 0;
  if (now - last < rules.RATE_MS) return true;
  rates.set(ip, now);
  return false;
}

function safeStaticPath(urlPath) {
  try {
    const decoded = decodeURIComponent(urlPath.split("?")[0]);
    const requested = decoded === "/" ? "/index.html" : decoded;
    const resolved = path.resolve(ROOT, `.${requested}`);
    if (!resolved.startsWith(ROOT + path.sep) && resolved !== ROOT) return null;
    const rel = path.relative(ROOT, resolved).split(path.sep);
    if (rel[0] === "index.html") return resolved;
    if (!STATIC_ROOTS.has(rel[0])) return null;
    return resolved;
  } catch (error) {
    return null;
  }
}

function readBody(req, limit = 200_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error("内容太大"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function handleApi(req, res, url) {
  const route = url.pathname.replace(/\/+$/, "") || "/";
  const secure = url.protocol === "https:" || req.headers["x-forwarded-proto"] === "https";

  if (route === "/api/session" && req.method === "GET") {
    sendJson(res, 200, { admin: isAdmin(req) });
    return;
  }

  if (route === "/api/session" && req.method === "POST") {
    const secret = adminSecret();
    if (!secret) {
      sendJson(res, 503, { error: "未配置 HUB_ADMIN_TOKEN" });
      return;
    }
    const body = JSON.parse((await readBody(req)) || "{}");
    if (!tokenOk(String(body.token || ""), secret)) {
      sendJson(res, 403, { error: "口令不对" });
      return;
    }
    sendJson(res, 200, { admin: true }, { "Set-Cookie": cookieHeader(signSession(secret), secure) });
    return;
  }

  if (route === "/api/session" && req.method === "DELETE") {
    sendJson(res, 200, { admin: false }, { "Set-Cookie": clearCookie(secure) });
    return;
  }

  if (route === "/api/content" && req.method === "GET") {
    sendJson(res, 200, {
      notes: readJson("notes.json", { items: [] }),
      watchlist: readJson("watchlist.json", { sectors: [] }),
      now: readJson("now.json", { text: "" }),
    });
    return;
  }

  if (route === "/api/notes" && req.method === "PUT") {
    if (!isAdmin(req)) {
      sendJson(res, 401, { error: "访客不能改观点" });
      return;
    }
    const notes = rules.assertNotes(JSON.parse((await readBody(req)) || "{}"));
    writeJson("notes.json", notes);
    sendJson(res, 200, { ok: true, notes });
    return;
  }

  if (route === "/api/watchlist" && req.method === "PUT") {
    if (!isAdmin(req)) {
      sendJson(res, 401, { error: "访客不能改盯盘" });
      return;
    }
    const watchlist = rules.assertWatchlist(JSON.parse((await readBody(req)) || "{}"));
    writeJson("watchlist.json", watchlist);
    sendJson(res, 200, { ok: true, watchlist });
    return;
  }

  if (route === "/api/now" && req.method === "PUT") {
    if (!isAdmin(req)) {
      sendJson(res, 401, { error: "这项只能我来改" });
      return;
    }
    const now = rules.assertNow(JSON.parse((await readBody(req)) || "{}"));
    writeJson("now.json", now);
    sendJson(res, 200, { ok: true, now });
    return;
  }

  if (route === "/api/danmaku" && req.method === "GET") {
    sendJson(res, 200, readJson("danmaku.json", { items: [] }));
    return;
  }

  if (route === "/api/danmaku" && req.method === "POST") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const safe = rules.assertDanmaku(body);
    const ip = clientIp(req);
    if (limited(ip)) {
      sendJson(res, 429, { error: "发太快了，过几秒再试" });
      return;
    }
    const store = readJson("danmaku.json", { items: [] });
    const item = {
      id: `d_${crypto.randomBytes(6).toString("hex")}`,
      nick: safe.nick,
      text: safe.text,
      createdAt: new Date().toISOString(),
    };
    store.items = [...(store.items || []), item].slice(-rules.DANMAKU_KEEP);
    store.updatedAt = item.createdAt;
    writeJson("danmaku.json", store);
    sendJson(res, 200, { item });
    return;
  }

  if (route === "/api/danmaku" && req.method === "DELETE") {
    if (!isAdmin(req)) {
      sendJson(res, 401, { error: "只有作者能清弹幕" });
      return;
    }
    writeJson("danmaku.json", { updatedAt: new Date().toISOString(), items: [] });
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, { error: "找不到这个接口" });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      send(res, 405, "Method Not Allowed");
      return;
    }
    const file = safeStaticPath(url.pathname);
    if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      send(res, 404, "Not Found", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }
    const ext = path.extname(file).toLowerCase();
    send(res, 200, fs.readFileSync(file), { "Content-Type": MIME[ext] || "application/octet-stream" });
  } catch (error) {
    const status = error.status || (error instanceof SyntaxError ? 400 : 500);
    sendJson(res, status, { error: error.message || "服务器出错了" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Chase hub http://127.0.0.1:${PORT}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`端口 ${PORT} 已被占用，设 PORT= 换一个，不要自动漂移。`);
    process.exit(1);
  }
  throw error;
});
