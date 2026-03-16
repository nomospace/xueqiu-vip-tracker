# Snowball VIP Monitor - 雪球大V动态监听系统

> 个人投资者实时跟踪雪球大V观点与持仓变动的自动化工具

## 🏗️ 项目结构

```
snowball-vip-monitor/
├── frontend/          # Angular 前端
│   ├── src/
│   ├── angular.json
│   └── package.json
├── backend/           # FastAPI 后端
│   ├── app/
│   ├── requirements.txt
│   └── main.py
├── docs/              # 文档
│   ├── PRD.md
│   └── API.md
├── scripts/           # 部署脚本
│   └── deploy.sh
├── docker-compose.yml
└── README.md
```

## 🚀 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | Angular 17+ + Tailwind CSS + ECharts | 响应式布局，图表可视化 |
| 后端 | Python 3.11 + FastAPI | 异步高性能框架 |
| 数据库 | PostgreSQL 15 + Redis 7 | 结构化数据 + 缓存 |
| 任务调度 | Celery + Celery Beat | 定时爬虫任务 |
| 部署 | Docker + Nginx | 容器化部署 |

## 📋 功能模块

- **大V管理**：添加/删除/查看大V信息
- **动态监听**：实时抓取大V发帖、转发、评论
- **持仓监控**：追踪大V持仓变动，识别加仓/减仓
- **通知推送**：WebSocket实时推送新动态
- **数据可视化**：持仓图表、动态统计

## 🔧 快速开始

```bash
# 后端
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# 前端
cd frontend
npm install
ng serve
```

## 📖 文档

- [PRD 产品需求文档](./docs/PRD.md)
- [API 接口文档](./docs/API.md)

## ⚠️ 免责声明

本项目仅供个人学习研究使用，不用于任何商业目的。
使用本工具需遵守雪球《用户协议》，数据版权归雪球所有。

## 📜 License

MIT