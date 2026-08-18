import { esc, toast, api, formatDay, icon, appIcon, shotImg } from "./util.js";
import { bindThemeSwitch, bindGlassLight } from "./theme.js";
import { initAdmin } from "./admin.js";
import { initDanmaku } from "./danmaku.js";

const RESEARCH = "https://fresearch.cc.cd/";

const state = {
  site: null,
  notes: { items: [] },
  watchlist: { sectors: [], disclaimer: "" },
  now: { text: "" },
  admin: false,
};

export function getState() {
  return state;
}

export function setAdmin(on) {
  state.admin = Boolean(on);
  document.body.classList.toggle("admin", state.admin);
  if (state.site) renderHero();
}

export function setContent({ notes, watchlist, now }) {
  if (notes) state.notes = notes;
  if (watchlist) state.watchlist = watchlist;
  if (now) state.now = now;
}

function noteHref(item) {
  return item?.slug ? `/notes/${encodeURIComponent(item.slug)}/` : "#notes";
}

function liveProjects() {
  return (state.site.projects || []).filter((item) => item.status === "live" && item.live);
}

function setSectionVisible(id, on) {
  const section = document.getElementById(id)?.closest(".section");
  if (section) section.hidden = !on;
}

function renderHero() {
  const profile = state.site.profile;
  const projects = liveProjects();
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
    github?.href ? `<a class="btn" rel="me noopener" href="${esc(github.href)}" target="_blank">${appIcon("github", 22)} GitHub</a>` : "",
    twitter?.href ? `<a class="btn" rel="me noopener" href="${esc(twitter.href)}" target="_blank">${appIcon("x", 22)} X</a>` : "",
    mail?.href ? `<a class="btn" href="${esc(mail.href)}">${appIcon("mail", 22)} 写信</a>` : "",
  ].join("");
  const nowText = state.now?.text || "";
  const nowBox = document.getElementById("profileNow");
  if (nowBox) {
    nowBox.hidden = !nowText && !state.admin;
    const label = nowBox.querySelector(".now-text");
    if (label) label.textContent = nowText || "写一句最近在做的事";
  }
  const noteCount = (state.notes.items || []).length;
  const stockCount = (state.watchlist.sectors || []).reduce((sum, sector) => sum + (sector.stocks || []).length, 0);
  document.getElementById("statRow").innerHTML = `
    <div class="stat"><b>${projects.length}</b><span>在线站点</span></div>
    <div class="stat"><b>${noteCount}</b><span>条观点</span></div>
    <div class="stat"><b>${stockCount}</b><span>只在盯</span></div>
  `;
}

function renderSites() {
  const items = liveProjects();
  setSectionVisible("siteGrid", items.length > 0);
  document.getElementById("siteGrid").innerHTML = items.map((item) => {
    const github = item.github && item.githubPublic !== false
      ? `<a class="btn" href="${esc(item.github)}" target="_blank" rel="noopener">${appIcon("github", 18)} GitHub</a>`
      : "";
    return `
    <article class="card glass" data-tint="${esc(item.tint || "blue")}">
      ${item.shot && item.live ? `<a class="shot" href="${esc(item.live)}" target="_blank" rel="noopener">${shotImg(item.shot)}</a>` : ""}
      <div class="card-top">
        <span class="well app">${appIcon(item.icon || "book", 46)}</span>
        <span class="pill live">
          <i class="live-dot" aria-hidden="true"></i>
          在线
        </span>
      </div>
      <div>
        <span class="pill">${esc(item.tag)}</span>
        <h3>${esc(item.name)}</h3>
      </div>
      <p>${esc(item.summary)}</p>
      <div class="card-links">
        ${item.live ? `<a class="btn primary" href="${esc(item.live)}" target="_blank" rel="noopener">${icon("arrow")} 打开</a>` : ""}
        ${github}
      </div>
    </article>`;
  }).join("");
}

function renderNotes() {
  const items = state.notes.items || [];
  document.getElementById("noteList").innerHTML = items.length ? items.map((item) => `
    <article class="note glass" data-id="${esc(item.id)}">
      <time>${icon("feather")} ${esc(formatDay(item.createdAt))}</time>
      <h3>${item.slug ? `<a href="${esc(noteHref(item))}">${esc(item.title)}</a>` : esc(item.title)}</h3>
      <p>${esc(item.body)}</p>
      ${item.slug ? `<p class="note-more"><a href="${esc(noteHref(item))}">阅读全文</a></p>` : ""}
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
              <span class="symbol"><a href="${esc(RESEARCH)}" target="_blank" rel="noopener">${esc(stock.symbol)}</a></span>
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
    <a class="contact glass" href="${esc(item.href)}" ${item.href.startsWith("mailto:") ? "" : `target="_blank" rel="${item.id === "github" || item.id === "x" ? "me noopener" : "noopener"}"`}>
      <span class="well app">${appIcon(item.icon || "mail", 56)}</span>
      <small>${esc(item.label)}</small>
      <strong>${esc(item.handle || item.label)}</strong>
    </a>
  `).join("");
}

export function render() {
  if (!state.site) return;
  renderHero();
  renderSites();
  renderNotes();
  renderWatch();
  renderContact();
}

async function loadContent() {
  const site = await fetch("/data/site.json").then((res) => res.json());
  state.site = site;
  try {
    const content = await api("/api/content");
    setContent(content);
  } catch (error) {
    const [notes, watchlist, now] = await Promise.all([
      fetch("/data/notes.json").then((res) => res.json()),
      fetch("/data/watchlist.json").then((res) => res.json()),
      fetch("/data/now.json").then((res) => res.json()).catch(() => ({ text: "" })),
    ]);
    setContent({ notes, watchlist, now });
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
