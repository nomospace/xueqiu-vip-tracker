# 脱水雪球 📊

> 雪球大V观点脱水工具，AI智能分析核心投资信息

## 功能

- **智能脱水** - AI 分析大V观点，提取核心投资逻辑
- **情绪分析** - 自动判断看多/看空/中性态度
- **标的识别** - 识别提及的股票代码和态度
- **风险提示** - 自动提取风险预警信息

## 技术栈

| 组件 | 技术 |
|------|------|
| 前端 | Angular 17 + Tailwind CSS |
| 后端 | FastAPI + SQLAlchemy |
| 数据库 | SQLite |
| AI | 通义千问 / DeepSeek |

## 快速开始

```bash
# 克隆项目
git clone https://github.com/nomospace/xueqiu-vip-tracker.git
cd xueqiu-vip-tracker

# 配置环境变量
export DASHSCOPE_API_KEY="your-key"  # 或 DEEPSEEK_API_KEY

# 一键部署
./deploy.sh
```

访问：http://localhost:3007

## Cookie 配置

登录雪球网页版 → F12 → Network → 复制 Cookie → 粘贴到首页

> Cookie 需包含 `xq_a_token` 字段

## 目录结构

```
├── frontend/          # Angular 前端
├── backend/           # FastAPI 后端
├── scripts/           # 部署脚本
└── deploy.sh          # 一键部署
```

## 免责声明

仅供学习研究，遵守雪球用户协议，投资有风险。

## License

MIT