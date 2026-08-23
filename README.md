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
- 只展示已经挂在公网上的站点，作者可在内容工作台管理排序与上下线
- 「最近在做」、项目、观点、板块、个股：只有作者能改
- 项目支持上传真实页面截图；路过的人可以从右下角展开留言

## 作者编辑

点击导航栏的「管理」，输入 `.env` 里的 `HUB_ADMIN_TOKEN`。登录后会进入内容工作台，可管理项目、观点、板块和个股，也可以下载完整备份、恢复默认内容或撤销上一次保存。公网 KV 自动保留每类内容最近 10 个版本；登录状态有效 7 天。

本机写入 `data/site.json`、`data/notes.json`、`data/watchlist.json`、`data/now.json`、`data/danmaku.json`。

## 公网（Cloudflare Pages）

生产地址：`https://chaestblog.pages.dev/`。

**云端自动发（推荐）**：在 GitHub 仓库 Settings → Secrets and variables → Actions 添加 `CLOUDFLARE_API_TOKEN`（Cloudflare Pages 编辑权限）。之后推送到 `main` 或本仓库的工作分支，GitHub Actions 会直接发生产，不用开本机。

本机仍可手动发：

```bash
bash scripts/deploy-pages.sh
```

自定义域名 `chaestblog.is-a.dev` 需要：

1. 这份 Pages 部署成功
2. is-a.dev 的注册 PR 合并（CNAME → `chaestblog.pages.dev`）
3. 在 [cf-pages.is-a.dev](https://cf-pages.is-a.dev) 把 `chaestblog.is-a.dev` 加到 Pages 项目

然后在 Pages 项目设置：

1. 环境变量 `HUB_ADMIN_TOKEN`
2. KV 命名空间，绑定名必须是 `HUB_KV`（招呼和在线编辑靠它持久化）

## 联系方式

写在 `data/site.json` 的 `socials` 里。现在公开的是 GitHub、邮箱、X（@johny_xie）和 Buy Me a Coffee。没有的渠道不要占空位。
