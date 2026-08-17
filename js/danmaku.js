import { api, toast } from "./util.js";

const seen = new Set();

function spawn(item, { instant = false } = {}) {
  if (!item?.id || seen.has(item.id)) return;
  seen.add(item.id);
  const stage = document.getElementById("danmakuStage");
  if (!stage) return;
  const node = document.createElement("div");
  const nick = item.nick ? `${item.nick} · ` : "";
  node.className = "danmaku-item";
  node.textContent = `${nick}${item.text}`;
  node.style.top = `${8 + Math.random() * 72}vh`;
  node.style.animationDuration = `${10 + Math.random() * 8}s`;
  if (instant) node.style.animationDelay = `${-Math.random() * 8}s`;
  stage.append(node);
  node.addEventListener("animationend", () => node.remove());
}

async function pull(instant) {
  try {
    const data = await api("/api/danmaku");
    for (const item of data.items || []) spawn(item, { instant });
  } catch (error) {
    if (instant) toast("招呼暂时发不出去，页面还能看。");
  }
}

export function initDanmaku() {
  const form = document.getElementById("danmakuForm");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nick = document.getElementById("danmakuNick").value.trim();
    const text = document.getElementById("danmakuText").value.trim();
    if (!text) return;
    try {
      const saved = await api("/api/danmaku", {
        method: "POST",
        body: JSON.stringify({ nick, text }),
      });
      document.getElementById("danmakuText").value = "";
      spawn(saved.item);
    } catch (error) {
      toast(error.message || "没发出去，稍后再试");
    }
  });
  pull(true);
  setInterval(() => pull(false), 8000);
}
