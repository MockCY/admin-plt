# ARVELLO 管理后台

独立的 React + TypeScript 管理端，通过 `/api/admin/**` 连接 ARVELLO Spring Boot 服务。

## 本地运行

需要 Node.js 20.19+ 或 22.12+：

```text
pnpm install
pnpm dev
```

开发服务器默认运行在 `http://127.0.0.1:5174`，并将 `/api` 与 `/media` 转发到
`http://127.0.0.1:8080`。启动后端前，需要先执行 `server/database/08-admin-console.sql`，并设置：

```text
ADMIN_USERNAME=admin
ADMIN_PASSWORD=一个足够长的随机密码
```

首次启动后端时会创建管理员账号，数据库仅保存 BCrypt 密码摘要。

## 生产构建

```text
pnpm build
```

`Dockerfile` 使用 Nginx 托管静态文件，并把 `/api` 与 `/media` 转发到名为
`arvello-backend` 的后端容器。`server/deploy/docker-compose.yml` 已同时包含后端和管理端，
启动后管理端监听 `http://127.0.0.1:8081`。生产环境应只通过 HTTPS 暴露后台。
