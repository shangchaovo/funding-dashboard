# Chase Xie · chaestblog

个人导航：https://chaestblog.is-a.dev/ （Cloudflare Pages 备用：`chaestblog.pages.dev`）

跳转到已上线的项目，写观点和盯盘笔记。路过可以打个招呼。

## 本机

```bash
cp .env.example .env   # 改 HUB_ADMIN_TOKEN
node server.js         # http://127.0.0.1:8777
```

端口被占用时进程会直接退出，不会自动换端口。

## 页面

- **玻璃 / 护眼 / 墨夜** 三套主题，记在浏览器 localStorage
- 只展示已经挂在公网上的站点（读 `data/site.json`）
- 「最近在做」、观点、板块、个股：只有作者能改
- 路过的人可以在底部打招呼

## 作者编辑

连点头像五次，或打开 `http://127.0.0.1:8777/?edit=1`，输入 `.env` 里的 `HUB_ADMIN_TOKEN`。

本机写入 `data/notes.json`、`data/watchlist.json`、`data/now.json`、`data/danmaku.json`。

## 公网（Cloudflare Pages）

```bash
bash scripts/deploy-pages.sh
```

项目名默认 `chaestblog`，上线后地址是 `https://chaestblog.pages.dev/`。自定义域名 `chaestblog.is-a.dev` 需要：

1. 这份 Pages 部署成功
2. is-a.dev 的注册 PR 合并（CNAME → `chaestblog.pages.dev`）
3. 在 [cf-pages.is-a.dev](https://cf-pages.is-a.dev) 把 `chaestblog.is-a.dev` 加到 Pages 项目

然后在 Pages 项目设置：

1. 环境变量 `HUB_ADMIN_TOKEN`
2. KV 命名空间，绑定名必须是 `HUB_KV`（招呼和在线编辑靠它持久化）

## 联系方式

写在 `data/site.json` 的 `socials` 里。现在公开的是 GitHub、邮箱、X（@johny_xie）和 Buy Me a Coffee。没有的渠道不要占空位。
