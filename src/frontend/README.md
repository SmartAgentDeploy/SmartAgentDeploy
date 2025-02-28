# SmartAgentDeploy Frontend

前端界面，用于 SmartAgentDeploy 平台，这是一个结合区块链技术与高级 AI 的去中心化 AI 交易代理平台。

## 功能

- 用户认证（登录/注册）
- 钱包连接
- AI 交易代理部署
- 代理训练和管理
- 市场数据可视化
- 性能分析

## 技术栈

- HTML5/CSS3
- JavaScript (ES6+)
- Bootstrap 5
- Chart.js
- 与后端 API 集成

## 安装

1. 安装依赖
   ```
   npm install
   ```

2. 启动开发服务器
   ```
   npm run dev
   ```

3. 构建生产版本
   ```
   npm run build
   ```

## 目录结构

- `index.html` - 主 HTML 文件
- `css/` - 样式文件
- `js/` - JavaScript 文件
- `server.js` - 用于提供前端文件的简单 Express 服务器

## 与后端集成

前端通过 RESTful API 与后端通信。API 端点在 `js/app.js` 文件中的 `API_BASE_URL` 常量中定义。

## 浏览器兼容性

- Chrome (最新版)
- Firefox (最新版)
- Safari (最新版)
- Edge (最新版) 