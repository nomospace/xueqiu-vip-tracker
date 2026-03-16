# 雪球大V追踪器 (Xueqiu VIP Tracker)

> 轻量级雪球大V监控工具，追踪大V动态与持仓变动

## ✨ 功能特性

- **大V管理** - 添加、删除、查看关注的雪球大V
- **动态监控** - 实时查看大V发布的动态
- **持仓追踪** - 追踪大V持仓变化（开发中）
- **数据可视化** - 清晰的仪表盘展示

## 🛠️ 技术栈

| 组件 | 技术 |
|------|------|
| 前端 | Angular 17 + Tailwind CSS |
| 后端 | FastAPI + SQLAlchemy |
| 数据库 | SQLite（开发）/ PostgreSQL（生产） |
| 任务调度 | APScheduler |

## 📦 一键部署

```bash
# 克隆项目
git clone https://github.com/nomospace/xueqiu-vip-tracker.git
cd xueqiu-vip-tracker

# 一键部署
./scripts/deploy.sh
```

部署完成后访问：http://localhost:3007

## 🔧 手动启动

### 后端

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 前端

```bash
cd frontend
npm install
npx ng serve --host 0.0.0.0 --port 4200
```

## 📁 项目结构

```
xueqiu-vip-tracker/
├── frontend/           # Angular 前端
│   ├── src/
│   └── angular.json
├── backend/            # FastAPI 后端
│   ├── app/
│   │   ├── api/       # API 路由
│   │   ├── models/    # 数据模型
│   │   ├── services/  # 业务逻辑
│   │   └── tasks/     # 定时任务
│   └── requirements.txt
├── scripts/            # 部署脚本
│   └── deploy.sh
└── README.md
```

## 🌐 API 文档

启动后端后访问：
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## ⚙️ 配置

### Cookie 配置

由于雪球 WAF 限制，需要配置 Cookie 才能自动爬取数据：

```bash
# 创建 Cookie 文件
echo "你的雪球Cookie" > ~/.xueqiu_cookie
```

Cookie 获取方式：
1. 登录雪球网页版
2. 打开开发者工具 → Network → 找任意请求
3. 复制 Cookie 值

## 📊 端口说明

| 服务 | 端口 |
|------|------|
| Nginx (对外) | 3007 |
| 前端开发服务 | 4200 |
| 后端 API | 8000 |

## ⚠️ 免责声明

本项目仅供个人学习研究使用，不用于任何商业目的。
使用本工具需遵守雪球《用户协议》，数据版权归雪球所有。

## 📜 License

MIT