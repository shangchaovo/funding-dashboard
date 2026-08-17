#!/usr/bin/env bash
# Deploy Chase hub to Cloudflare Pages.
# 只上传页面、静态资源和 functions；不上传 server.js / .env / .git。
set -euo pipefail

cd "$(dirname "$0")/.."
STAGE="$(mktemp -d /tmp/chase-hub.XXXXXX)"
trap 'rm -rf "$STAGE"' EXIT

cp index.html "$STAGE/"
for dir in assets css js data functions; do
  cp -R "$dir" "$STAGE/"
done

npx -y wrangler@4.113.0 pages deploy "$STAGE" \
  --project-name "${CLOUDFLARE_PAGES_PROJECT:-chaestblog}" \
  --commit-dirty=true

echo "部署完成。在 Pages 设置里加："
echo "  HUB_ADMIN_TOKEN = 你的管理口令"
echo "  KV 绑定名称 HUB_KV（弹幕和在线编辑需要它）"
