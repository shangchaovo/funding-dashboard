import { THEMES, esc, toast, api, formatDay } from "./util.js";
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
  document.getElementById("profileKicker").textContent = profile.kicker;
  document.getElementById("profileTitle").textContent = profile.title;
  document.getElementById("profileBio").textContent = profile.bio;
  const actions = document.getElementById("heroActions");
  const github = state.site.socials.find((item) => item.id === "github");
  const mail = state.site.socials.find((item) => item.id === "email");
  const coffee = state.site.socials.find((item) => item.id === "bmc");
  actions.innerHTML = [
    github?.href ? `<a class="btn primary" href="${esc(github.href)}" target="_blank" rel="noopener">GitHub</a>` : "",
    mail?.href ? `<a class="btn" href="${esc(mail.href)}">写信</a>` : "",
    coffee?.href ? `<a class="btn" href="${esc(coffee.href)}" target="_blank" rel="noopener">Buy Me a Coffee</a>` : "",
  ].join("");
}

function renderJumps() {
  document.getElementById("jumpGrid").innerHTML = state.site.jumps.map((item) => `
    <a class="jump glass" href="${esc(item.href)}" target="_blank" rel="noopener">
      <strong>${esc(item.name)}</strong>
      <span>${esc(item.blurb)}</span>
    </a>
  `).join("");
}

function renderProjects() {
  document.getElementById("projectGrid").innerHTML = state.site.projects.map((item) => `
    <article class="card glass">
      <div class="card-top">
        <span class="pill">${esc(item.tag)}</span>
        <span class="pill ${item.status === "live" ? "live" : "degraded"}">${item.status === "live" ? "LIVE" : "公网待修"}</span>
      </div>
      <h3>${esc(item.name)}</h3>
      <p>${esc(item.summary)}</p>
      <div class="card-links">
        ${item.live ? `<a class="btn primary" href="${esc(item.live)}" target="_blank" rel="noopener">打开站点</a>` : ""}
        ${item.github ? `<a class="btn" href="${esc(item.github)}" target="_blank" rel="noopener">GitHub</a>` : ""}
      </div>
    </article>
  `).join("");
}

function renderNotes() {
  const items = state.notes.items || [];
  document.getElementById("noteList").innerHTML = items.length ? items.map((item) => `
    <article class="note glass" data-id="${esc(item.id)}">
      <time>${esc(formatDay(item.createdAt))}</time>
      <h3>${esc(item.title)}</h3>
      <p>${esc(item.body)}</p>
      <div class="note-actions">
        <button class="btn" type="button" data-edit-note="${esc(item.id)}">改</button>
        <button class="btn danger" type="button" data-del-note="${esc(item.id)}">删</button>
      </div>
    </article>
  `).join("") : `<div class="empty glass">还没有观点。登录后可以写第一条。</div>`;
}

function renderWatch() {
  const sectors = state.watchlist.sectors || [];
  document.getElementById("watchDisclaimer").textContent = state.watchlist.disclaimer || "";
  document.getElementById("watchList").innerHTML = sectors.length ? sectors.map((sector) => `
    <article class="sector glass" data-id="${esc(sector.id)}">
      <div class="card-top">
        <span class="pill">${esc((sector.stocks || []).length)} 只</span>
        <div class="row-actions">
          <button class="btn" type="button" data-edit-sector="${esc(sector.id)}">改板块</button>
          <button class="btn danger" type="button" data-del-sector="${esc(sector.id)}">删板块</button>
        </div>
      </div>
      <h3>${esc(sector.name)}</h3>
      <p>${esc(sector.thesis)}</p>
      <div class="stocks">
        ${(sector.stocks || []).map((stock) => `
          <div class="stock" data-id="${esc(stock.id)}">
            <div class="stock-head">
              <span class="symbol">${esc(stock.symbol)}</span>
              <strong>${esc(stock.name)}</strong>
              <div class="row-actions">
                <button class="btn" type="button" data-edit-stock="${esc(sector.id)}:${esc(stock.id)}">改</button>
                <button class="btn danger" type="button" data-del-stock="${esc(sector.id)}:${esc(stock.id)}">删</button>
              </div>
            </div>
            <p>${esc(stock.reason)}</p>
          </div>
        `).join("")}
      </div>
    </article>
  `).join("") : `<div class="empty glass">还没有盯盘笔记。</div>`;
}

function renderContact() {
  document.getElementById("contactGrid").innerHTML = state.site.socials.map((item) => {
    if (item.kind === "soon" || !item.href) {
      return `<div class="contact glass soon"><small>${esc(item.label)}</small><strong>暂未公开</strong><small>有账号再填进 data/site.json</small></div>`;
    }
    return `<a class="contact glass" href="${esc(item.href)}" target="_blank" rel="noopener">
      <small>${esc(item.label)}</small>
      <strong>${esc(item.handle || item.label)}</strong>
      <small>打开 ↗</small>
    </a>`;
  }).join("");
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
