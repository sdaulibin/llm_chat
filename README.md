# 智能办公助手

## 项目介绍

智能办公助手是一个基于Vue 3和Vite构建的AI对话应用，集成了Dify API实现智能对话功能。该应用可以帮助用户快速获取信息、解答问题，提高办公效率。

## 技术栈

- **前端框架**：Vue 3 (使用`<script setup>`语法)
- **构建工具**：Vite
- **AI接口**：Dify API
- **Markdown渲染**：markdown-it

## 功能特点

- 智能对话：通过集成Dify API实现智能问答功能
- 会话持久化：支持保存对话历史记录
- 流式响应：实时显示AI回复内容
- 建议问题：提供下一步可能的问题建议
- 历史记录：保存并可重新使用历史提问

## 安装与使用

### 安装依赖

```bash
npm install
```

### 开发模式运行

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## API配置

应用默认使用预设的Dify API密钥，如需修改，可在`src/components/ChatContainer.vue`文件中更新：

```javascript
const API_KEY = ref('your-api-key-here');
```

## 项目结构

```
├── public/             # 静态资源
├── src/                # 源代码
│   ├── assets/         # 资源文件
│   ├── components/     # 组件
│   │   ├── ChatContainer.vue  # 聊天容器组件
│   │   └── Sidebar.vue        # 侧边栏组件
│   ├── services/       # 服务
│   │   └── difyApi.js  # Dify API服务
│   ├── App.vue         # 主应用组件
│   ├── main.js         # 入口文件
│   └── style.css       # 全局样式
├── index.html          # HTML模板
├── package.json        # 项目依赖
└── vite.config.js      # Vite配置
```

## Dify API集成

本项目集成了Dify对话型应用API，支持以下功能：

- 发送聊天消息
- 流式响应处理
- 获取建议问题
- 会话管理

详细API文档可参考`Dify-api.md`文件。

## 开发指南

### IDE支持

推荐使用Visual Studio Code进行开发，并安装Volar插件以获得更好的Vue 3支持。详情请参考[Vue文档中的工具支持指南](https://vuejs.org/guide/scaling-up/tooling.html#ide-support)。
