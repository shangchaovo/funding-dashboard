# CLAUDE.md

Chase Xie 个人导航站。无构建、无框架：`index.html` + `css/` + `js/`（ESM）+ `server.js`。

```bash
node server.js                 # http://127.0.0.1:8777
python3 scripts/test-api.py    # 接口冒烟（自起临时端口）
```

- 静态只允许 `index.html`、`robots.txt`、`sitemap.xml`、`css/`、`js/`、`data/`、`assets/`、`about/`、`notes/`。
- 管理态靠 HMAC 签名 cookie，密钥是 `HUB_ADMIN_TOKEN`。
- Cloudflare Pages Functions 在 `functions/api/[[path]].js`，KV 绑定名 `HUB_KV`。
- 项目、观点和盯盘都可从网页内容工作台维护；接口为 `/api/projects`、`/api/notes`、`/api/watchlist`。
- 管理员保存会在 KV 留最近 10 个版本；`/api/restore` 支持恢复默认稿或上一个版本。
