"""
数据库连接 - SQLite
"""

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

# 使用 SQLite 作为开发数据库
DATABASE_URL = "sqlite+aiosqlite:///./snowball_vip.db"

engine = create_async_engine(DATABASE_URL, echo=False)

# 使用 sessionmaker 而非 async_sessionmaker（兼容 Python 3.6）
async_session = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def get_db():
    """获取数据库会话"""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """初始化数据库"""
    # 导入模型确保 Base 已注册所有表
    from app.models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)