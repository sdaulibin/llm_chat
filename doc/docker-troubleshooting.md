# Docker 容器访问问题排查指南

## 问题描述

在使用 Docker 部署智能办公助手应用时，容器启动后无法正常访问应用。

## 问题原因分析

经过排查，发现以下几个可能的问题原因：

1. **环境变量配置问题**：
   - `VITE_API_BASE_URL` 环境变量未正确设置或未被正确替换
   - 在构建时，前端代码中的 API 基础 URL 占位符未被正确替换

2. **网络配置问题**：
   - Docker 容器内部的端口映射配置不正确
   - 宿主机与容器之间的网络通信存在问题

## 解决方案

### 1. 正确设置环境变量

确保在启动 Docker 容器时正确设置 `VITE_API_BASE_URL` 环境变量：

```bash
docker run -d -p 8080:8080 -e VITE_API_BASE_URL=http://your-api-server:5000 star_llm_chat:1.0.0
```

### 2. 检查端口映射

确保 Docker 容器的端口映射正确：

```bash
docker run -d -p 8080:8080 star_llm_chat:1.0.0
```

这将把容器内的 8080 端口映射到宿主机的 8080 端口。

### 3. 检查网络连接

确保宿主机可以访问 API 服务器：

```bash
curl http://your-api-server:5000
```

### 4. 查看容器日志

检查容器的日志以获取更多信息：

```bash
docker logs <container_id>
```

### 5. 进入容器检查配置

进入容器内部检查 Nginx 配置和环境变量：

```bash
docker exec -it <container_id> /bin/sh

# 检查 Nginx 配置
cat /etc/nginx/conf.d/default.conf

# 检查环境变量
env | grep VITE
```

## 预防措施

1. **使用 .env 文件**：在开发环境中使用 .env 文件设置环境变量
2. **优化 Dockerfile**：确保 Dockerfile 中的环境变量替换逻辑正确
3. **添加健康检查**：在 Docker 容器中添加健康检查，以便及时发现问题

## 常见问题解答

### Q: 为什么容器启动成功但无法访问应用？

A: 可能是因为环境变量未正确设置，导致前端应用无法连接到后端 API。请确保正确设置 `VITE_API_BASE_URL` 环境变量。

### Q: 如何确认环境变量已正确替换？

A: 可以进入容器内部，检查 JavaScript 文件中是否包含正确的 API URL，或者查看 Nginx 配置文件中的代理设置。

### Q: 如何在本地测试 Docker 镜像？

A: 使用以下命令在本地测试 Docker 镜像：

```bash
docker build -t star_llm_chat:test .
docker run -d -p 8080:8080 -e VITE_API_BASE_URL=http://localhost:5000 star_llm_chat:test
```

然后在浏览器中访问 http://localhost:8080 查看应用是否正常运行。