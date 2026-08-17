# Chase Xie · 个人导航站

Liquid Glass 主题的个人导航：跳转到已上线的 vibe-coding 项目，写观点和盯盘笔记。访客只能发弹幕。

## 本机

```bash
cp .env.example .env   # 改 HUB_ADMIN_TOKEN
node server.js         # http://127.0.0.1:8777
```

端口被占用时进程会直接退出，不会自动换端口。

## 页面

- **玻璃 / 护眼 / 墨夜** 三套主题，记在浏览器 localStorage
- 项目墙与快速跳转只展示已经挂在公网上的站点（读 `data/site.json`）
- 观点、板块、个股：只有作者能改
- 访客弹幕从右向左飞过；长度、间隔和链接会被拦住

## 作者编辑

连点头像五次，或打开 `http://127.0.0.1:8777/?edit=1`，输入 `.env` 里的 `HUB_ADMIN_TOKEN`。登录后可以写观点、改盯盘、清空弹幕。访客看不到入口，也改不了正文。

本机写入 `data/notes.json`、`data/watchlist.json`、`data/danmaku.json`。

## 公网（Cloudflare Pages）

```bash
bash scripts/deploy-pages.sh
```

然后在 Pages 项目设置：

1. 环境变量 `HUB_ADMIN_TOKEN`
2. KV 命名空间，绑定名必须是 `HUB_KV`（弹幕和在线编辑靠它持久化）

没绑 KV 时页面仍能打开，种子稿来自仓库 JSON；发弹幕或保存笔记会提示先绑 KV。

## 联系方式

写在 `data/site.json` 的 `socials` 里。现在公开的是 GitHub、邮箱、X（@johny_xie）和 Buy Me a Coffee。没有的渠道不要占空位。
