"""
mini脱水雪球 - FastAPI Backend
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import vip, posts, holdings, ws, tasks


app = FastAPI(
    title="mini脱水雪球 API",
    description="雪球大V动态监听系统",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(vip.router, prefix="/api/vip", tags=["大V管理"])
app.include_router(posts.router, prefix="/api/posts", tags=["动态监听"])
app.include_router(holdings.router, prefix="/api/holdings", tags=["持仓监控"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["定时任务"])
app.include_router(ws.router, prefix="/ws", tags=["WebSocket"])


@app.on_event("startup")
async def startup_event():
    """启动时执行"""
    from app.core.database import init_db
    # 初始化数据库
    await init_db()


@app.get("/")
async def root():
    return {
        "name": "脱水雪球 API",
        "version": "1.0.0",
        "docs": "/api/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}