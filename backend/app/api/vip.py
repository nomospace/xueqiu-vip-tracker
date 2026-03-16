"""
mini脱水雪球 - 大V管理 API
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
import os

from app.core.database import get_db
from app.models.models import VIPUser

router = APIRouter()


# ============ 请求/响应模型 ============

class VIPCreate(BaseModel):
    xueqiu_id: str
    nickname: Optional[str] = None  # 可选手动输入
    followers: Optional[int] = 0


class VIPResponse(BaseModel):
    id: int
    xueqiu_id: str
    nickname: str
    avatar: Optional[str] = None
    followers: int
    description: Optional[str] = None

    class Config:
        orm_mode = True  # Pydantic v1 兼容


class StatusResponse(BaseModel):
    id: str
    text: str
    title: str
    created_at: int
    retweet_count: int
    reply_count: int
    like_count: int


class PortfolioResponse(BaseModel):
    cube_id: str
    name: str
    symbol: str
    net_value: float
    total_gain: float


class RebalancingResponse(BaseModel):
    cube_id: str
    rebalancing_id: str
    created_at: int
    holdings: List[dict]


# ============ Cookie 检查 ============

@router.get("/check-cookie")
async def check_cookie():
    """检查 Cookie 是否已配置"""
    cookie_file = os.path.expanduser("~/.xueqiu_cookie")
    has_cookie = os.path.exists(cookie_file) and os.path.getsize(cookie_file) > 0
    return {"has_cookie": has_cookie}


class CookieInput(BaseModel):
    cookie: str


@router.post("/cookie")
async def save_cookie(data: CookieInput):
    """保存 Cookie"""
    cookie_file = os.path.expanduser("~/.xueqiu_cookie")
    with open(cookie_file, "w") as f:
        f.write(data.cookie)
    os.chmod(cookie_file, 0o600)
    return {"message": "Cookie 保存成功"}


# ============ 大V管理 ============


class RebalancingResponse(BaseModel):
    cube_id: str
    rebalancing_id: str
    created_at: int
    holdings: List[dict]


# ============ 大V管理 ============

@router.get("", response_model=List[VIPResponse])
async def get_vip_list(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """获取大V列表"""
    result = await db.execute(
        select(VIPUser).order_by(VIPUser.followers.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.post("", response_model=VIPResponse)
async def add_vip(
    vip_data: VIPCreate,
    db: AsyncSession = Depends(get_db)
):
    """添加大V
    
    自动爬取用户信息（如果失败则使用手动输入或默认值）
    """
    # 检查是否已存在
    result = await db.execute(
        select(VIPUser).where(VIPUser.xueqiu_id == vip_data.xueqiu_id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="该大V已存在")
    
    # 尝试爬取用户信息
    nickname = vip_data.nickname or f"用户{vip_data.xueqiu_id}"
    followers = vip_data.followers or 0
    avatar = None
    description = None
    
    try:
        from app.services.xueqiu_service import crawl_vip
        crawl_result = crawl_vip(vip_data.xueqiu_id)
        
        if crawl_result.get("success") and crawl_result.get("user_info"):
            user_info = crawl_result["user_info"]
            # 爬取成功则使用爬取的数据（除非手动指定）
            if not vip_data.nickname:
                nickname = user_info.get("screen_name") or nickname
            if not vip_data.followers:
                followers = user_info.get("followers_count") or followers
            avatar = user_info.get("avatar")
            description = user_info.get("description")
    except Exception as e:
        print(f"爬取失败: {e}")
    
    # 创建记录
    new_vip = VIPUser(
        xueqiu_id=vip_data.xueqiu_id,
        nickname=nickname,
        avatar=avatar,
        followers=followers,
        description=description
    )
    
    db.add(new_vip)
    await db.commit()
    await db.refresh(new_vip)
    
    return new_vip


@router.get("/{vip_id}", response_model=VIPResponse)
async def get_vip_detail(
    vip_id: int,
    db: AsyncSession = Depends(get_db)
):
    """获取大V详情"""
    result = await db.execute(
        select(VIPUser).where(VIPUser.id == vip_id)
    )
    vip = result.scalar_one_or_none()
    
    if not vip:
        raise HTTPException(status_code=404, detail="大V不存在")
    
    return vip


@router.delete("/{vip_id}")
async def delete_vip(
    vip_id: int,
    db: AsyncSession = Depends(get_db)
):
    """删除大V"""
    result = await db.execute(
        select(VIPUser).where(VIPUser.id == vip_id)
    )
    vip = result.scalar_one_or_none()
    
    if not vip:
        raise HTTPException(status_code=404, detail="大V不存在")
    
    await db.delete(vip)
    await db.commit()
    
    return {"message": "删除成功"}


# ============ 动态相关 ============

@router.get("/{vip_id}/statuses", response_model=List[StatusResponse])
async def get_vip_statuses(
    vip_id: int,
    status_type: int = Query(0, description="动态类型: 0=原发布, 2=长文, 11=交易"),
    count: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """获取大V动态
    
    动态类型：
    - 0: 原发布（原创文章、评论等）
    - 2: 长文
    - 11: 交易（股票买卖记录）
    """
    result = await db.execute(
        select(VIPUser).where(VIPUser.id == vip_id)
    )
    vip = result.scalar_one_or_none()
    
    if not vip:
        raise HTTPException(status_code=404, detail="大V不存在")
    
    # 实时爬取
    from app.services.xueqiu_service import XueqiuService
    import asyncio
    
    async def fetch():
        service = XueqiuService()
        try:
            await service.init_browser()
            statuses = await service.get_user_statuses(vip.xueqiu_id, status_type, count)
            await service.close()
            return statuses
        except Exception as e:
            await service.close()
            raise e
    
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                statuses = pool.submit(asyncio.run, fetch()).result()
        else:
            statuses = loop.run_until_complete(fetch())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"爬取动态失败: {e}")
    
    return [s.__dict__ for s in statuses]


# ============ 组合相关 ============

@router.get("/{vip_id}/portfolios", response_model=List[PortfolioResponse])
async def get_vip_portfolios(
    vip_id: int,
    db: AsyncSession = Depends(get_db)
):
    """获取大V组合列表"""
    result = await db.execute(
        select(VIPUser).where(VIPUser.id == vip_id)
    )
    vip = result.scalar_one_or_none()
    
    if not vip:
        raise HTTPException(status_code=404, detail="大V不存在")
    
    # 实时爬取
    from app.services.xueqiu_service import XueqiuService
    import asyncio
    
    async def fetch():
        service = XueqiuService()
        try:
            await service.init_browser()
            portfolios = await service.get_user_portfolios(vip.xueqiu_id)
            await service.close()
            return portfolios
        except Exception as e:
            await service.close()
            raise e
    
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                portfolios = pool.submit(asyncio.run, fetch()).result()
        else:
            portfolios = loop.run_until_complete(fetch())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"爬取组合失败: {e}")
    
    return [p.__dict__ for p in portfolios]


@router.get("/{vip_id}/rebalancing/{cube_symbol}", response_model=List[RebalancingResponse])
async def get_vip_rebalancing(
    vip_id: int,
    cube_symbol: str,
    count: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """获取组合调仓历史
    
    返回调仓记录，包含：
    - 调仓时间
    - 变动明细（买入/卖出股票）
    """
    result = await db.execute(
        select(VIPUser).where(VIPUser.id == vip_id)
    )
    vip = result.scalar_one_or_none()
    
    if not vip:
        raise HTTPException(status_code=404, detail="大V不存在")
    
    # 实时爬取
    from app.services.xueqiu_service import XueqiuService
    import asyncio
    
    async def fetch():
        service = XueqiuService()
        try:
            await service.init_browser()
            rebalancings = await service.get_portfolio_rebalancing(cube_symbol, count)
            await service.close()
            return rebalancings
        except Exception as e:
            await service.close()
            raise e
    
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                rebalancings = pool.submit(asyncio.run, fetch()).result()
        else:
            rebalancings = loop.run_until_complete(fetch())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"爬取调仓记录失败: {e}")
    
    return [r.__dict__ for r in rebalancings]