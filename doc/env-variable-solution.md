# Docker容器环境变量配置指南

## 问题描述

在启动Docker容器时，如果未正确设置`VITE_API_BASE_URL`环境变量，容器会启动失败并显示错误信息：

```
错误: VITE_API_BASE_URL 环境变量未设置
```

## 解决方案

我们已经对Dockerfile进行了修改，添加了默认值处理机制，使容器在环境变量未设置时也能正常启动。现在，如果未设置`VITE_API_BASE_URL`环境变量，系统会自动使用默认值`http://localhost:5000`。

### 启动容器的方法

#### 方法1：使用脚本启动（推荐）

使用项目中的`docker_run.sh`脚本启动容器：

```bash
# 使用默认配置启动
./scripts/docker_run.sh

# 指定API服务器地址
./scripts/docker_run.sh -a http://your-api-server:5000

# 查看帮助信息
./scripts/docker_run.sh -h
```

#### 方法2：直接使用Docker命令启动

```bash
# 使用默认API地址
docker run -d -p 8080:8080 star_llm_chat:1.0.0

# 指定API服务器地址
docker run -d -p 8080:8080 -e VITE_API_BASE_URL=http://your-api-server:5000 star_llm_chat:1.0.0
```

## 环境变量说明

- `VITE_API_BASE_URL`：API服务器的基础URL，用于前端应用连接后端服务
  - 默认值：`http://localhost:5000`
  - 示例：`http://api.example.com`、`http://192.168.1.100:5000`

## 注意事项

1. 虽然现在容器可以在未设置环境变量的情况下启动，但仍然建议明确设置`VITE_API_BASE_URL`环境变量，以确保应用能够正确连接到您的API服务器。

2. 如果您的API服务器不在本地运行，请务必将`VITE_API_BASE_URL`设置为正确的服务器地址，否则应用将无法正常工作。

3. 在生产环境中，请确保API服务器地址使用正确的协议（HTTP/HTTPS）和端口。