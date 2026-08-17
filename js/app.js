import { THEMES, esc, toast, api, formatDay, icon, appIcon } from "./util.js";
import { initAdmin } from "./admin.js";
import { initDanmaku } from "./danmaku.js";

const state = {
  site: null,
  notes: { items: [] },
  watchlist: { sectors: [], disclaimer: "" },
  admin: false,
};

export function getState() {
  return state;
}

export function setAdmin(on) {
  state.admin = Boolean(on);
  document.body.classList.toggle("admin", state.admin);
}

export function setContent({ notes, watchlist }) {
  if (notes) state.notes = notes;
  if (watchlist) state.watchlist = watchlist;
}

function applyTheme(theme, persist) {
  const next = THEMES.includes(theme) ? theme : "liquid";
  document.documentElement.dataset.theme = next;
  if (persist) {
    try { localStorage.setItem("hubTheme", next); } catch (error) {}
  }
  for (const button of document.querySelectorAll(".theme-btn")) {
    button.setAttribute("aria-pressed", String(button.dataset.theme === next));
  }
}

function bindThemeSwitch() {
  applyTheme(document.documentElement.dataset.theme || "liquid", false);
  document.querySelector(".theme-switch")?.addEventListener("click", (event) => {
    const button = event.target.closest(".theme-btn");
    if (!button) return;
    applyTheme(button.dataset.theme, true);
  });
}

function bindGlassLight() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  window.addEventListener("pointermove", (event) => {
    const x = Math.round((event.clientX / window.innerWidth) * 100);
    const y = Math.round((event.clientY / window.innerHeight) * 100);
    document.documentElement.style.setProperty("--glass-x", `${x}%`);
    document.documentElement.style.setProperty("--glass-y", `${y}%`);
  }, { passive: true });
}

function renderHero() {
  const profile = state.site.profile;
  const jumps = state.site.jumps || [];
  const projects = state.site.projects || [];
  document.getElementById("profileKicker").innerHTML = `${icon("spark")} ${esc(profile.kicker)}`;
  document.getElementById("profileName").textContent = profile.name;
  document.getElementById("profileTitle").textContent = profile.title;
  document.getElementById("profileBio").textContent = profile.bio;
  const github = state.site.socials.find((item) => item.id === "github");
  const mail = state.site.socials.find((item) => item.id === "email");
  const coffee = state.site.socials.find((item) => item.id === "bmc");
  const twitter = state.site.socials.find((item) => item.id === "x");
  document.getElementById("heroActions").innerHTML = [
    coffee?.href ? `<a class="btn primary" href="${esc(coffee.href)}" target="_blank" rel="noopener">${appIcon("coffee", 22)} 请我喝杯咖啡</a>` : "",
    github?.href ? `<a class="btn" href="${esc(github.href)}" target="_blank" rel="noopener">${appIcon("github", 22)} GitHub</a>` : "",
    twitter?.href ? `<a class="btn" href="${esc(twitter.href)}" target="_blank" rel="noopener">${appIcon("x", 22)} X</a>` : "",
    mail?.href ? `<a class="btn" href="${esc(mail.href)}">${appIcon("mail", 22)} 写信</a>` : "",
  ].join("");
  const liveCount = projects.filter((item) => item.status === "live").length;
  document.getElementById("statRow").innerHTML = `
    <div class="stat"><b>${projects.length}</b><span>个项目</span></div>
    <div class="stat"><b>${liveCount}</b><span>已上线</span></div>
    <div class="stat"><b>${jumps.length}</b><span>常用</span></div>
  `;
  const latest = (state.notes.items || [])[0];
  const sector = (state.watchlist.sectors || [])[0];
  document.getElementById("featuredJumps").innerHTML = [
    latest ? `
      <a class="feature glass" data-tint="violet" href="#notes">
        <span class="well app">${appIcon("notes", 52)}</span>
        <span class="feature-copy">
          <strong>${esc(latest.title)}</strong>
          <span>最近在想 · ${esc(formatDay(latest.createdAt))}</span>
        </span>
        ${icon("arrow", "ic ic-arrow")}
      </a>
    ` : `
      <a class="feature glass" data-tint="violet" href="#notes">
        <span class="well app">${appIcon("notes", 52)}</span>
        <span class="feature-copy"><strong>最近在想</strong><span>过几天再来看看</span></span>
      </a>
    `,
    sector ? `
      <a class="feature glass" data-tint="amber" href="#watch">
        <span class="well app">${appIcon("watch", 52)}</span>
        <span class="feature-copy">
          <strong>${esc(sector.name)}</strong>
          <span>最近在盯 · ${(sector.stocks || []).length} 只</span>
        </span>
        ${icon("arrow", "ic ic-arrow")}
      </a>
    ` : `
      <a class="feature glass" data-tint="amber" href="#watch">
        <span class="well app">${appIcon("watch", 52)}</span>
        <span class="feature-copy"><strong>最近在盯</strong><span>这阵子没盯什么票</span></span>
      </a>
    `,
  ].join("");
}

function renderJumps() {
  document.getElementById("jumpGrid").innerHTML = state.site.jumps.map((item) => `
    <a class="jump glass" data-tint="${esc(item.tint || "blue")}" href="${esc(item.href)}" target="_blank" rel="noopener">
      <div class="jump-top">
        <span class="well app">${appIcon(item.icon || "book", 52)}</span>
        ${icon("external")}
      </div>
      <strong>${esc(item.name)}</strong>
      <span>${esc(item.blurb)}</span>
    </a>
  `).join("");
}

function renderProjects() {
  document.getElementById("projectGrid").innerHTML = state.site.projects.map((item, index) => `
    <article class="card glass ${index < 2 ? "wide" : ""}" data-tint="${esc(item.tint || "blue")}">
      <div class="card-top">
        <span class="well app">${appIcon(item.icon || "book", 52)}</span>
        <span class="pill ${item.status === "live" ? "live" : "degraded"}">
          <i class="live-dot" aria-hidden="true"></i>
          ${item.status === "live" ? "在线" : "检修中"}
        </span>
      </div>
      <div>
        <span class="pill">${esc(item.tag)}</span>
        <h3>${esc(item.name)}</h3>
      </div>
      <p>${esc(item.summary)}</p>
      <div class="card-links">
        ${item.live ? `<a class="btn primary" href="${esc(item.live)}" target="_blank" rel="noopener">${icon("arrow")} 打开</a>` : ""}
        ${item.github ? `<a class="btn" href="${esc(item.github)}" target="_blank" rel="noopener">${appIcon("github", 18)} GitHub</a>` : ""}
      </div>
    </article>
  `).join("");
}

function renderNotes() {
  const items = state.notes.items || [];
  document.getElementById("noteList").innerHTML = items.length ? items.map((item) => `
    <article class="note glass" data-id="${esc(item.id)}">
      <time>${icon("feather")} ${esc(formatDay(item.createdAt))}</time>
      <h3>${esc(item.title)}</h3>
      <p>${esc(item.body)}</p>
      <div class="note-actions">
        <button class="btn" type="button" data-edit-note="${esc(item.id)}">${icon("edit")} 改</button>
        <button class="btn danger" type="button" data-del-note="${esc(item.id)}">${icon("trash")} 删</button>
      </div>
    </article>
  `).join("") : `<div class="empty glass">${appIcon("notes", 48)}<span>最近没什么想写的。</span></div>`;
}

function renderWatch() {
  const sectors = state.watchlist.sectors || [];
  document.getElementById("watchDisclaimer").textContent = state.watchlist.disclaimer || "";
  document.getElementById("watchList").innerHTML = sectors.length ? sectors.map((sector) => `
    <article class="sector glass" data-id="${esc(sector.id)}" data-tint="amber">
      <div class="card-top">
        <span class="well app">${appIcon("watch", 48)}</span>
        <span class="pill">${esc((sector.stocks || []).length)} 只</span>
      </div>
      <h3>${esc(sector.name)}</h3>
      <p>${esc(sector.thesis)}</p>
      <div class="row-actions">
        <button class="btn" type="button" data-edit-sector="${esc(sector.id)}">${icon("edit")} 改板块</button>
        <button class="btn danger" type="button" data-del-sector="${esc(sector.id)}">${icon("trash")} 删板块</button>
      </div>
      <div class="stocks">
        ${(sector.stocks || []).map((stock) => `
          <div class="stock" data-id="${esc(stock.id)}">
            <div class="stock-head">
              <span class="symbol">${esc(stock.symbol)}</span>
              <strong>${esc(stock.name)}</strong>
              <div class="row-actions">
                <button class="btn" type="button" data-edit-stock="${esc(sector.id)}:${esc(stock.id)}">${icon("edit")}</button>
                <button class="btn danger" type="button" data-del-stock="${esc(sector.id)}:${esc(stock.id)}">${icon("trash")}</button>
              </div>
            </div>
            <p>${esc(stock.reason)}</p>
          </div>
        `).join("")}
      </div>
    </article>
  `).join("") : `<div class="empty glass">${appIcon("watch", 48)}<span>这阵子没盯什么票。</span></div>`;
}

function renderContact() {
  const items = (state.site.socials || []).filter((item) => item.kind !== "soon" && item.href);
  document.getElementById("contactGrid").innerHTML = items.map((item) => `
    <a class="contact glass" href="${esc(item.href)}" ${item.href.startsWith("mailto:") ? "" : 'target="_blank" rel="noopener"'}>
      <span class="well app">${appIcon(item.icon || "mail", 56)}</span>
      <small>${esc(item.label)}</small>
      <strong>${esc(item.handle || item.label)}</strong>
    </a>
  `).join("");
}

export function render() {
  if (!state.site) return;
  renderHero();
  renderJumps();
  renderProjects();
  renderNotes();
  renderWatch();
  renderContact();
}

async function loadContent() {
  const site = await fetch("data/site.json").then((res) => res.json());
  state.site = site;
  try {
    const content = await api("/api/content");
    setContent(content);
  } catch (error) {
    const [notes, watchlist] = await Promise.all([
      fetch("data/notes.json").then((res) => res.json()),
      fetch("data/watchlist.json").then((res) => res.json()),
    ]);
    setContent({ notes, watchlist });
    toast("内容接口暂不可用，已显示仓库里的种子稿。");
  }
}

async function boot() {
  bindThemeSwitch();
  bindGlassLight();
  await loadContent();
  render();
  try {
    const session = await api("/api/session");
    setAdmin(Boolean(session.admin));
  } catch (error) {
    setAdmin(false);
  }
  initAdmin();
  initDanmaku();
}

boot().catch((error) => toast(error.message || "页面启动失败"));
