# 脱水雪球

> 雪球大V数据追踪工具，按需爬取关注的大V动态与持仓

## ✨ 功能特性

- **大V管理** - 添加、删除、查看关注的雪球大V
- **按需爬取** - 手动触发爬取，无定时任务
- **Cookie 配置** - 网页端配置 Cookie，方便更新
- **动态查看** - 查看大V发布的动态
- **持仓追踪** - 查看大V组合与调仓记录（开发中）

## 🛠️ 技术栈

| 组件 | 技术 |
|------|------|
| 前端 | Angular 17 + Tailwind CSS |
| 后端 | FastAPI + SQLAlchemy |
| 数据库 | SQLite |

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
│   └── src/
│       └── app/
│           ├── pages/  # 页面组件
│           └── services/
├── backend/            # FastAPI 后端
│   └── app/
│       ├── api/       # API 路由
│       ├── models/    # 数据模型
│       └── services/  # 业务逻辑
├── scripts/            # 部署脚本
│   └── deploy.sh
└── README.md
```

## 🌐 API 文档

启动后端后访问：
- Swagger UI: http://localhost:3007/api/docs
- ReDoc: http://localhost:3007/api/redoc

## ⚙️ Cookie 配置

由于雪球 WAF 限制，需要配置 Cookie 才能爬取数据：

1. 登录雪球网页版
2. 按 F12 打开开发者工具
3. 切换到 Network 标签
4. 刷新页面，找任意请求
5. 复制请求头中的 Cookie 值
6. 在「脱水雪球」网页中粘贴保存

## 📊 端口说明

| 服务 | 端口 |
|------|------|
| Nginx (对外) | 3007 |
| 后端 API | 8000 |

## ⚠️ 免责声明

本项目仅供个人学习研究使用，不用于任何商业目的。
使用本工具需遵守雪球《用户协议》，数据版权归雪球所有。

## 📜 License

MIT