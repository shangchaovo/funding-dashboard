# CLAUDE.md

Chase Xie 个人导航站。无构建、无框架：`index.html` + `css/` + `js/`（ESM）+ `server.js`。

```bash
node server.js                 # http://127.0.0.1:8777
python3 scripts/test-api.py    # 接口冒烟（自起临时端口）
```

- 静态只允许 `index.html`、`css/`、`js/`、`data/`、`assets/`。
- 管理态靠 HMAC 签名 cookie，密钥是 `HUB_ADMIN_TOKEN`。
- Cloudflare Pages Functions 在 `functions/api/[[path]].js`，KV 绑定名 `HUB_KV`。
- 改项目列表只动 `data/site.json`；观点和盯盘走 `/api/notes`、`/api/watchlist`。
