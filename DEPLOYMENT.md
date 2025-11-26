# 弹珠编程打砖块游戏 - 部署说明

## 游戏信息
**游戏名称**: 弹珠编程打砖块 - 炼金术士守城

这是一个结合了弹珠物理、编程机制和打砖块玩法的创新游戏。玩家通过编程弹珠的行为来击碎砖块，同时管理能量系统和收集模块奖励。

## 技术栈
- **前端框架**: React 18.3.1 + TypeScript 5.6.3
- **游戏引擎**: PixiJS 8.14.3（2D渲染）
- **物理引擎**: Matter.js 0.20.0（物理模拟）
- **动画库**: GSAP 3.13.0, Framer Motion 12.23.22
- **UI组件**: Radix UI（完整的组件库）
- **构建工具**: Vite 7.1.9
- **样式**: Tailwind CSS 4.1.14
- **后端**: Express 4.21.2（静态文件服务）

## 本地开发

### 安装依赖
```bash
pnpm install
```

### 启动开发服务器
```bash
pnpm dev
```
开发服务器将在 http://localhost:3000 启动

### 构建生产版本
```bash
pnpm build
```
构建产物将输出到 `dist/` 目录

### 启动生产服务器
```bash
pnpm start
```
生产服务器将在 http://localhost:3000 启动

## 部署选项

### 选项 1: 静态网站托管
由于游戏是纯前端应用，可以部署到任何静态网站托管服务：

- **Vercel**: 推荐，零配置部署
- **Netlify**: 简单易用
- **GitHub Pages**: 免费托管
- **Cloudflare Pages**: 全球CDN加速

部署步骤（以 Vercel 为例）：
1. 连接 GitHub 仓库到 Vercel
2. 构建命令：`pnpm build`
3. 输出目录：`dist/public`
4. 自动部署

### 选项 2: Node.js 服务器
使用内置的 Express 服务器部署：

```bash
# 构建项目
pnpm build

# 启动服务器
NODE_ENV=production node dist/index.js
```

服务器配置：
- 端口：3000（可通过环境变量修改）
- 静态文件目录：`dist/public`

### 选项 3: Docker 部署
创建 `Dockerfile`:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

构建和运行：
```bash
docker build -t marble-breakout-game .
docker run -p 3000:3000 marble-breakout-game
```

## 环境变量配置

在 `index.html` 中使用了以下环境变量（可选）：
- `VITE_APP_TITLE`: 应用标题
- `VITE_APP_LOGO`: 应用Logo URL
- `VITE_ANALYTICS_ENDPOINT`: 分析端点
- `VITE_ANALYTICS_WEBSITE_ID`: 分析网站ID

创建 `.env` 文件来配置这些变量：
```env
VITE_APP_TITLE=弹珠编程打砖块 - 炼金术士守城
VITE_APP_LOGO=/logo.png
```

## 性能优化建议

1. **代码分割**: 已配置动态导入，但某些chunk较大，可进一步优化
2. **资源压缩**: 启用 gzip/brotli 压缩
3. **CDN加速**: 将静态资源部署到CDN
4. **缓存策略**: 配置合理的浏览器缓存
5. **懒加载**: 对游戏资源实施懒加载策略

## 游戏特性

### 核心玩法
- **弹珠物理系统**: 基于 Matter.js 的真实物理模拟
- **子弹编程**: 玩家可以编程弹珠的行为模式
- **砖块系统**: 动态生成和下落的砖块
- **能量管理**: 战略性的资源管理系统
- **奖励系统**: 转盘抽奖获取模块奖励

### 交互优化
- **移动端支持**: 完整的触控操作优化
- **响应式设计**: 适配各种屏幕尺寸
- **流畅动画**: GSAP 和 Framer Motion 驱动的动画效果
- **视觉反馈**: 丰富的视觉特效和反馈

## 已实现功能
- ✅ 基础游戏循环系统
- ✅ 子弹编程模块系统
- ✅ 缓冲阵列和弹珠掉落系统
- ✅ 能量系统
- ✅ 模块图标渲染系统
- ✅ 子弹槽命名系统
- ✅ 移动端触控优化
- ✅ 玩家阶段交互优化
- ✅ 设置页面和配置系统
- ✅ 弹珠发射模式（自动/手动）
- ✅ 奖励缓冲器系统
- ✅ 转盘式抽奖UI
- ✅ 模块池和库存系统
- ✅ 编辑器模块库存支持

## 待优化功能
- ⏳ 奖励缓冲器触发概率测试
- ⏳ 奖励缓冲器位置优化
- ⏳ 子弹编辑器拖拽排序
- ⏳ 砖块下落动画优化
- ⏳ 模块说明页面
- ⏳ 能量上限显示优化
- ⏳ 完整游戏流程测试
- ⏳ 性能优化和代码清理

## 项目结构
```
marble-breakout-game/
├── client/              # 前端代码
│   ├── src/
│   │   ├── components/  # React组件
│   │   ├── game/        # 游戏核心逻辑
│   │   ├── contexts/    # React上下文
│   │   ├── hooks/       # 自定义Hooks
│   │   ├── pages/       # 页面组件
│   │   └── types/       # TypeScript类型定义
│   ├── public/          # 静态资源
│   └── index.html       # HTML模板
├── server/              # 后端代码
│   └── index.ts         # Express服务器
├── shared/              # 共享代码
│   └── const.ts         # 共享常量
└── dist/                # 构建输出（gitignore）
```

## 许可证
MIT License

## 联系方式
如有问题或建议，请在 GitHub 仓库提交 Issue。
