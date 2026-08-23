const DANMAKU_MAX = 36;
const NICK_MAX = 12;
const NOTE_TITLE_MAX = 80;
const NOTE_BODY_MAX = 4000;
const SECTOR_NAME_MAX = 40;
const TEXT_MAX = 800;
const DANMAKU_KEEP = 200;
const RATE_MS = 8000;
const PROJECT_TINTS = new Set(["violet", "cyan", "amber", "rose", "gold", "blue", "green"]);
const PROJECT_STATUSES = new Set(["live", "hidden"]);
const BLOCKED = [
  /https?:\/\//i,
  /<script/i,
  /\b(fuck|shit|bitch)\b/i,
  /加微信/,
  /免费领取/,
];

function clip(value, max) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanText(value, max) {
  return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

function blocked(value) {
  return BLOCKED.some((rule) => rule.test(value));
}

function assertDanmaku({ nick, text }) {
  const safeNick = clip(nick, NICK_MAX);
  const safeText = clip(text, DANMAKU_MAX);
  if (!safeText) throw Object.assign(new Error("先写点什么再发"), { status: 400 });
  if (blocked(safeText) || blocked(safeNick)) {
    throw Object.assign(new Error("这条发不出去，换个说法试试"), { status: 400 });
  }
  return { nick: safeNick, text: safeText };
}

function assertNotes(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (items.length > 100) throw Object.assign(new Error("观点太多了"), { status: 400 });
  return {
    updatedAt: new Date().toISOString(),
    items: items.map((item) => {
      const slug = String(item.slug || "").trim();
      return {
        id: clip(item.id, 40) || `n_${Date.now()}`,
        title: cleanText(item.title, NOTE_TITLE_MAX) || "未命名",
        body: cleanText(item.body, NOTE_BODY_MAX),
        createdAt: item.createdAt || new Date().toISOString(),
        ...( /^[a-z0-9-]{1,80}$/.test(slug) ? { slug } : {}),
      };
    }),
  };
}

function assertWatchlist(payload) {
  const sectors = Array.isArray(payload?.sectors) ? payload.sectors.slice(0, 20) : [];
  return {
    disclaimer: cleanText(payload?.disclaimer, 200) || "个人记录，不是投资建议。",
    updatedAt: new Date().toISOString(),
    sectors: sectors.map((sector) => ({
      id: clip(sector.id, 40) || `s_${Date.now()}`,
      name: cleanText(sector.name, SECTOR_NAME_MAX) || "未命名板块",
      thesis: cleanText(sector.thesis, TEXT_MAX),
      stocks: Array.isArray(sector.stocks) ? sector.stocks.slice(0, 30).map((stock) => ({
        id: clip(stock.id, 40) || `k_${Date.now()}`,
        symbol: clip(String(stock.symbol || "").toUpperCase(), 12),
        name: cleanText(stock.name, 40),
        reason: cleanText(stock.reason, TEXT_MAX),
      })) : [],
    })),
  };
}

function assertNow(payload) {
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

function assertProjects(payload) {
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

module.exports = {
  DANMAKU_KEEP,
  RATE_MS,
  assertDanmaku,
  assertNotes,
  assertWatchlist,
  assertNow,
  assertProjects,
};
