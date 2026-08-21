import {
  json,
  adminSecret,
  signSession,
  cookieHeader,
  clearCookie,
  isAdmin,
  readStore,
  writeStore,
  rateLimited,
  assertDanmaku,
  assertNotes,
  assertWatchlist,
  assertNow,
  randomId,
  tokenOk,
  DANMAKU_KEEP,
} from "../_utils.js";

function routeName(context) {
  const parts = context.params.path;
  if (Array.isArray(parts)) return parts.join("/");
  return String(parts || "");
}

async function readJson(request) {
  const text = await request.text();
  if (!text) return {};
  return JSON.parse(text);
}

export async function onRequest(context) {
  const { request, env } = context;
  const route = routeName(context);
  const method = request.method;

  try {
    if (route === "session" && method === "GET") {
      return json(200, { admin: await isAdmin(request, env) });
    }

    if (route === "session" && method === "POST") {
      const secret = adminSecret(env);
      if (!secret) return json(503, { error: "未配置 HUB_ADMIN_TOKEN" });
      const body = await readJson(request);
      if (!(await tokenOk(String(body.token || ""), secret))) return json(403, { error: "口令不对" });
      const value = await signSession(secret);
      return json(200, { admin: true }, { "Set-Cookie": cookieHeader(value, request) });
    }

    if (route === "session" && method === "DELETE") {
      return json(200, { admin: false }, { "Set-Cookie": clearCookie(request) });
    }

    if (route === "content" && method === "GET") {
      const [notes, watchlist, now] = await Promise.all([
        readStore(env, request, "notes", "/data/notes.json", { items: [] }),
        readStore(env, request, "watchlist", "/data/watchlist.json", { sectors: [] }),
        readStore(env, request, "now", "/data/now.json", { text: "" }),
      ]);
      return json(200, { notes, watchlist, now, kv: Boolean(env.HUB_KV) });
    }

    if (route === "notes" && method === "PUT") {
      if (!(await isAdmin(request, env))) return json(401, { error: "访客不能改观点" });
      const notes = assertNotes(await readJson(request));
      await writeStore(env, "notes", notes);
      return json(200, { ok: true, notes });
    }

    if (route === "watchlist" && method === "PUT") {
      if (!(await isAdmin(request, env))) return json(401, { error: "访客不能改盯盘" });
      const watchlist = assertWatchlist(await readJson(request));
      await writeStore(env, "watchlist", watchlist);
      return json(200, { ok: true, watchlist });
    }

    if (route === "now" && method === "PUT") {
      if (!(await isAdmin(request, env))) return json(401, { error: "这项只能我来改" });
      const now = assertNow(await readJson(request));
      await writeStore(env, "now", now);
      return json(200, { ok: true, now });
    }

    if (route === "danmaku" && method === "GET") {
      const store = await readStore(env, request, "danmaku", "/data/danmaku.json", { items: [] });
      return json(200, store);
    }

    if (route === "danmaku" && method === "POST") {
      const safe = assertDanmaku(await readJson(request));
      if (await rateLimited(env, request)) return json(429, { error: "发太快了，过几秒再试" });
      const store = await readStore(env, request, "danmaku", "/data/danmaku.json", { items: [] });
      const item = {
        id: randomId("d"),
        nick: safe.nick,
        text: safe.text,
        createdAt: new Date().toISOString(),
      };
      store.items = [...(store.items || []), item].slice(-DANMAKU_KEEP);
      store.updatedAt = item.createdAt;
      await writeStore(env, "danmaku", store);
      return json(200, { item });
    }

    if (route === "danmaku" && method === "DELETE") {
      if (!(await isAdmin(request, env))) return json(401, { error: "只有作者能清弹幕" });
      await writeStore(env, "danmaku", { updatedAt: new Date().toISOString(), items: [] });
      return json(200, { ok: true });
    }

    return json(404, { error: "找不到这个接口" });
  } catch (error) {
    const status = error.status || (error instanceof SyntaxError ? 400 : 500);
    return json(status, { error: error.message || "服务器出错了" });
  }
}
