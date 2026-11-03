# 部署

## 本地生产预览

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

打开 <http://127.0.0.1:3000>。生产页面与 API 均由同一个服务提供，`GET /health` 返回健康状态。
服务启动时自动读取可选的 `.env`。

## 环境变量

将 `.env.example` 复制为 `.env` 并按需修改：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `NODE_ENV` | — | 实际部署设置为 `production` |
| `HOST` | `127.0.0.1` | 容器需要时设置为 `0.0.0.0` |
| `PORT` | `3000` | 服务监听端口 |
| `PUBLIC_ORIGIN` | — | 浏览器访问的完整 HTTPS 来源，不带结尾 `/` |

生产会话 Cookie 启用 Secure、HttpOnly 和 SameSite=Strict，因此公开服务必须经过 HTTPS。
来源校验同时保护 HTTP 与 Socket.IO；展示 ID、客户端声明的 playerId 和 socket.id 都不作为凭据。

## 单实例要求

只能部署一个服务进程，不运行 Node cluster 或多副本。进程管理器应保持单实例，并允许 WebSocket 和长轮询。

## Nginx

HTTPS 可由平台或 Nginx 终止。`sameword.example.com` 的配置见 [`deploy/nginx.conf`](../deploy/nginx.conf)：
前端文件由 Nginx 直接提供，`/api/`、`/socket.io/` 和 `/health` 保留原路径转发到 `127.0.0.1:3000`。

该部署的 `.env` 设置为：

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
PUBLIC_ORIGIN=https://sameword.example.com
```

`PORT` 必须与 `deploy/nginx.conf` 中 `proxy_pass` 的端口一致，默认为 `3000`。

注意：

- `root` 指向 `/path/to/same-word/dist/client`，与 Vite 构建输出一致，而不是 `dist`。
- 配置文件须由 Nginx 的 `http` 块加载，不能把包含 `map` 的整份配置放入 `server` 块。
- `/assets/` 中带哈希的构建资源缓存一年，缺失文件返回 404；页面使用 `no-cache`，邀请链接刷新时回退到 `index.html`。
- 代理关闭 Nginx 缓存并保留 API 返回的 `Cache-Control: no-store`；Socket.IO 同时支持 WebSocket 升级与长轮询，
  读取超时为 75 秒。

构建并启动单个 Node.js 服务后，在服务器检查配置并重载 Nginx：

```sh
sudo nginx -t && sudo systemctl reload nginx
curl -fsS https://sameword.example.com/health
```

## 上线检查

- `curl -fsS https://<域名>/health` 返回 `{"ok":true}`。
- 邀请链接可直接刷新，静态资源命中长缓存而页面不被缓存。
- 两个独立浏览器可完成一局；断线重连后计时未延长。
- 重启进程会让进行中的房间失效，请提前通知玩家。