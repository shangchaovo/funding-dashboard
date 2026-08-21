import { api, toast, uid, esc } from "./util.js";
import { getState, setAdmin, setContent, render } from "./app.js";

function dialog(id) {
  return document.getElementById(id);
}

function field(label, name, value, type = "text") {
  if (type === "textarea") {
    return `<label class="field"><span>${esc(label)}</span><textarea name="${esc(name)}">${esc(value)}</textarea></label>`;
  }
  if (type === "select") {
    return `<label class="field"><span>${esc(label)}</span><select name="${esc(name)}">${value}</select></label>`;
  }
  return `<label class="field"><span>${esc(label)}</span><input name="${esc(name)}" value="${esc(value)}" /></label>`;
}

function openEditor({ title, html, onSubmit }) {
  const box = dialog("editorDialog");
  document.getElementById("editorTitle").textContent = title;
  document.getElementById("editorFields").innerHTML = html;
  const form = document.getElementById("editorForm");
  const submit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    await onSubmit(data);
    box.close();
  };
  form.onsubmit = submit;
  document.getElementById("editorCancel").onclick = () => box.close();
  box.showModal();
}

async function refreshContent() {
  const content = await api("/api/content");
  setContent(content);
  render();
}

async function saveNotes(items) {
  const payload = { updatedAt: new Date().toISOString(), items };
  await api("/api/notes", { method: "PUT", body: JSON.stringify(payload) });
  await refreshContent();
}

async function saveNow(text) {
  await api("/api/now", { method: "PUT", body: JSON.stringify({ text }) });
  await refreshContent();
}

async function saveWatchlist(watchlist) {
  const payload = { ...watchlist, updatedAt: new Date().toISOString() };
  await api("/api/watchlist", { method: "PUT", body: JSON.stringify(payload) });
  await refreshContent();
}

function bindAvatarUnlock() {
  const avatar = document.getElementById("heroAvatarBtn") || document.getElementById("heroAvatar");
  let taps = [];
  const maybeOpen = () => {
    const now = Date.now();
    taps = taps.filter((time) => now - time < 2200);
    taps.push(now);
    if (taps.length >= 5) {
      taps = [];
      dialog("adminDialog").showModal();
    }
  };
  avatar?.addEventListener("click", maybeOpen);
  if (new URLSearchParams(location.search).has("edit")) {
    dialog("adminDialog").showModal();
  }
}

function bindLogin() {
  document.getElementById("adminLoginBtn")?.addEventListener("click", async () => {
    const token = document.getElementById("adminToken").value;
    try {
      await api("/api/session", { method: "POST", body: JSON.stringify({ token }) });
      setAdmin(true);
      dialog("adminDialog").close();
      toast("已进入编辑模式");
    } catch (error) {
      toast(error.message || "口令不对");
    }
  });
}

function editNow() {
  openEditor({
    title: "最近在做",
    html: field("一句话", "text", getState().now?.text),
    onSubmit: async (data) => {
      await saveNow(data.text);
    },
  });
}

function editNote(existing) {
  openEditor({
    title: existing ? "改观点" : "写一条",
    html: field("标题", "title", existing?.title) + field("正文", "body", existing?.body, "textarea"),
    onSubmit: async (data) => {
      const items = [...(getState().notes.items || [])];
      if (existing) {
        const index = items.findIndex((item) => item.id === existing.id);
        if (index >= 0) items[index] = { ...existing, title: data.title, body: data.body };
      } else {
        items.unshift({
          id: uid("n"),
          title: data.title,
          body: data.body,
          createdAt: new Date().toISOString(),
        });
      }
      await saveNotes(items);
    },
  });
}

function editSector(existing) {
  openEditor({
    title: existing ? "改板块" : "加板块",
    html: field("板块名", "name", existing?.name) + field("理由", "thesis", existing?.thesis, "textarea"),
    onSubmit: async (data) => {
      const watchlist = structuredClone(getState().watchlist);
      if (existing) {
        const sector = watchlist.sectors.find((item) => item.id === existing.id);
        if (sector) {
          sector.name = data.name;
          sector.thesis = data.thesis;
        }
      } else {
        watchlist.sectors.push({ id: uid("s"), name: data.name, thesis: data.thesis, stocks: [] });
      }
      await saveWatchlist(watchlist);
    },
  });
}

function editStock(sectorId, existing) {
  const sectors = getState().watchlist.sectors || [];
  const options = sectors.map((sector) => (
    `<option value="${esc(sector.id)}" ${sector.id === sectorId ? "selected" : ""}>${esc(sector.name)}</option>`
  )).join("");
  openEditor({
    title: existing ? "改个股" : "加个股",
    html:
      field("板块", "sectorId", options, "select") +
      field("代码", "symbol", existing?.symbol) +
      field("名称", "name", existing?.name) +
      field("理由", "reason", existing?.reason, "textarea"),
    onSubmit: async (data) => {
      const watchlist = structuredClone(getState().watchlist);
      if (existing) {
        for (const sector of watchlist.sectors) {
          sector.stocks = (sector.stocks || []).filter((item) => item.id !== existing.id);
        }
      }
      const sector = watchlist.sectors.find((item) => item.id === data.sectorId);
      if (!sector) throw new Error("找不到板块");
      sector.stocks = sector.stocks || [];
      sector.stocks.push({
        id: existing?.id || uid("k"),
        symbol: String(data.symbol || "").toUpperCase(),
        name: data.name,
        reason: data.reason,
      });
      await saveWatchlist(watchlist);
    },
  });
}

function bindEditors() {
  document.getElementById("editNowBtn")?.addEventListener("click", () => editNow());
  document.getElementById("addNoteBtn")?.addEventListener("click", () => editNote(null));
  document.getElementById("addSectorBtn")?.addEventListener("click", () => editSector(null));
  document.getElementById("addStockBtn")?.addEventListener("click", () => {
    const first = getState().watchlist.sectors?.[0];
    if (!first) {
      toast("先加一个板块");
      return;
    }
    editStock(first.id, null);
  });
  document.getElementById("clearDanmakuBtn")?.addEventListener("click", async () => {
    if (!confirm("清空所有弹幕？")) return;
    await api("/api/danmaku", { method: "DELETE" });
    toast("弹幕已清空");
  });
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await api("/api/session", { method: "DELETE" });
    setAdmin(false);
    toast("已退出编辑");
  });

  document.body.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-edit-note], [data-del-note], [data-edit-sector], [data-del-sector], [data-edit-stock], [data-del-stock]");
    if (!target || !getState().admin) return;
    try {
      if (target.dataset.editNote) {
        editNote(getState().notes.items.find((item) => item.id === target.dataset.editNote));
      } else if (target.dataset.delNote) {
        if (!confirm("删除这条观点？")) return;
        await saveNotes(getState().notes.items.filter((item) => item.id !== target.dataset.delNote));
      } else if (target.dataset.editSector) {
        editSector(getState().watchlist.sectors.find((item) => item.id === target.dataset.editSector));
      } else if (target.dataset.delSector) {
        if (!confirm("删除这个板块和下面的个股？")) return;
        const watchlist = structuredClone(getState().watchlist);
        watchlist.sectors = watchlist.sectors.filter((item) => item.id !== target.dataset.delSector);
        await saveWatchlist(watchlist);
      } else if (target.dataset.editStock) {
        const [sectorId, stockId] = target.dataset.editStock.split(":");
        const sector = getState().watchlist.sectors.find((item) => item.id === sectorId);
        editStock(sectorId, sector?.stocks.find((item) => item.id === stockId));
      } else if (target.dataset.delStock) {
        const [sectorId, stockId] = target.dataset.delStock.split(":");
        const watchlist = structuredClone(getState().watchlist);
        const sector = watchlist.sectors.find((item) => item.id === sectorId);
        if (sector) sector.stocks = sector.stocks.filter((item) => item.id !== stockId);
        await saveWatchlist(watchlist);
      }
    } catch (error) {
      toast(error.message || "保存失败");
    }
  });
}

export function initAdmin() {
  bindAvatarUnlock();
  bindLogin();
  bindEditors();
}
