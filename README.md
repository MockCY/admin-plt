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

## 传感器与设备训练

- **传感器管理**：按编号、床序列号、用户、状态及绑定情况筛选；详情查看最新上报、累计次数、绑定历史，支持启用、停用、解绑。
- **训练记录 → 设备训练**：展示所属用户、床和传感器、首次/最后动作、训练时长、次数及结束原因；支持日期、状态筛选和筛选结果汇总。
- **训练记录 → 课程观看**：保留原课程观看记录，与设备训练分开展示。
- 用户列表和设备列表提供对应传感器或训练记录入口。解绑保留历史记录；停用终止当前训练并保留绑定，管理操作写入审计日志。

固件 4.0.0 使用 V4 协议，训练时长采用设备上报的有效时长，暂停不累计，连续 5 分钟无动作结束本次训练。V3 保留首次至最后动作的时长口径和 180 秒超时。日期筛选及显示使用北京时间；未校时记录显示时间待校准。
传感器详情展示固件版本、训练状态、节奏、电池及故障信息。现有数据库需先执行后端 `database/33-sensor-v4.sql` 再部署新版服务，具体迁移规则见后端 `SENSOR_V4.md`。

## 生产构建

```text
pnpm build
```

`Dockerfile` 使用 Nginx 托管静态文件，并把 `/api` 与 `/media` 转发到名为
`arvello-backend` 的后端容器。`server/deploy/docker-compose.yml` 已同时包含后端和管理端，
启动后管理端监听 `http://127.0.0.1:8081`。生产环境应只通过 HTTPS 暴露后台。
生产构建的静态资源前缀为 `/admin/`，可通过现有站点的
`https://manhart.top/admin/` 路径反向代理访问。

## GitHub Actions 自动部署

先成功部署后端，确保服务器已有 `/home/admin/deploy/.env` 和
`/home/admin/deploy/docker-compose.yml`。然后在后台仓库的
`Settings > Secrets and variables > Actions` 中配置：

- `SERVER_HOST`：服务器地址
- `SERVER_USER`：SSH 用户名（当前部署目录按 `admin` 用户配置）
- `SERVER_SSH_KEY`：SSH 私钥

推送到 `main` 后，`Deploy Admin` 工作流会构建并上传镜像，只更新
`arvello-admin` 服务。该仓库不需要配置 `DEPLOY_ENV`。
