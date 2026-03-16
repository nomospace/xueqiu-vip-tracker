"""
脱水雪球 - 大V管理 API
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
    nickname: Optional[str] = None
    followers: Optional[int] = 0
    cookie: Optional[str] = None  # 前端传递的Cookie


class CookieInput(BaseModel):
    cookie: str


class VIPResponse(BaseModel):
    id: int
    xueqiu_id: str
    nickname: str
    avatar: Optional[str] = None
    followers: int
    description: Optional[str] = None

    class Config:
        orm_mode = True


class StatusResponse(BaseModel):
    id: str
    user_id: str
    text: str
    title: str
    link: str
    created_at: str
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


# ============ Cookie 管理 ============

@router.get("/check-cookie")
async def check_cookie():
    """检查 Cookie 是否已配置"""
    cookie_file = os.path.expanduser("~/.xueqiu_cookie")
    has_cookie = os.path.exists(cookie_file) and os.path.getsize(cookie_file) > 0
    return {"has_cookie": has_cookie}


@router.get("/me")
async def get_current_user():
    """获取当前登录用户信息"""
    from app.services.xueqiu_service import XueqiuService
    
    service = XueqiuService()
    
    if not service.has_cookie():
        raise HTTPException(status_code=401, detail="请先配置 Cookie")
    
    user_id = service.get_current_user_id()
    if not user_id:
        raise HTTPException(status_code=401, detail="无法获取用户信息，请重新配置 Cookie")
    
    user_info = service.get_user_info(user_id)
    
    return {
        "user_id": user_info.user_id,
        "screen_name": user_info.screen_name,
        "avatar": user_info.avatar,
        "followers_count": user_info.followers_count,
        "friends_count": user_info.friends_count,
        "description": user_info.description,
    }


@router.get("/me/statuses")
async def get_my_statuses(
    status_type: int = Query(0, description="动态类型: 0=原发布, 11=交易"),
    count: int = Query(20, ge=1, le=50),
):
    """获取当前用户的动态"""
    from app.services.xueqiu_service import XueqiuService
    
    service = XueqiuService()
    
    if not service.has_cookie():
        raise HTTPException(status_code=401, detail="请先配置 Cookie")
    
    user_id = service.get_current_user_id()
    if not user_id:
        raise HTTPException(status_code=401, detail="无法获取用户信息")
    
    statuses = service.get_user_statuses(user_id, status_type, count)
    
    return [
        {
            "id": s.id,
            "user_id": s.user_id,
            "text": s.text,
            "title": s.title,
            "link": s.link,
            "created_at": s.created_at,
            "retweet_count": s.retweet_count,
            "reply_count": s.reply_count,
            "like_count": s.like_count,
        }
        for s in statuses
    ]


@router.post("/cookie")
async def save_cookie(data: CookieInput):
    """保存 Cookie"""
    cookie_file = os.path.expanduser("~/.xueqiu_cookie")
    try:
        with open(cookie_file, "w", encoding="utf-8") as f:
            f.write(data.cookie)
        os.chmod(cookie_file, 0o600)
        return {"message": "Cookie 保存成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存失败: {e}")


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
    """添加大V"""
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
    
    # 使用前端传递的Cookie
    cookie_file = os.path.expanduser("~/.xueqiu_cookie_temp")
    original_cookie_file = os.path.expanduser("~/.xueqiu_cookie")
    
    try:
        if vip_data.cookie:
            # 临时使用前端传递的Cookie
            with open(cookie_file, "w") as f:
                f.write(vip_data.cookie)
            if os.path.exists(original_cookie_file):
                os.rename(original_cookie_file, original_cookie_file + ".bak")
            os.rename(cookie_file, original_cookie_file)
        
        from app.services.xueqiu_service import crawl_vip
        crawl_result = crawl_vip(vip_data.xueqiu_id)
        
        if crawl_result.get("success") and crawl_result.get("user_info"):
            user_info = crawl_result["user_info"]
            if not vip_data.nickname:
                nickname = user_info.get("screen_name") or nickname
            if not vip_data.followers:
                followers = user_info.get("followers_count") or followers
            avatar = user_info.get("avatar")
            description = user_info.get("description")
    except Exception as e:
        print(f"爬取失败: {e}")
    finally:
        # 恢复原始Cookie文件
        if os.path.exists(original_cookie_file + ".bak"):
            if os.path.exists(original_cookie_file):
                os.remove(original_cookie_file)
            os.rename(original_cookie_file + ".bak", original_cookie_file)
    
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

class FetchStatusesRequest(BaseModel):
    user_id: str
    status_type: int = 0
    count: int = 10
    cookie: str = ""


class FetchCommentsRequest(BaseModel):
    user_id: str
    count: int = 20
    cookie: str = ""


@router.post("/fetch-statuses")
async def fetch_statuses(data: FetchStatusesRequest):
    """获取用户动态（使用前端提供的Cookie）"""
    import os
    import tempfile
    
    # 临时保存前端提供的Cookie
    cookie_file = os.path.expanduser("~/.xueqiu_cookie_temp")
    
    try:
        # 如果前端提供了Cookie，临时使用
        if data.cookie:
            with open(cookie_file, "w") as f:
                f.write(data.cookie)
            
            # 临时修改环境
            original_cookie_file = os.path.expanduser("~/.xueqiu_cookie")
            if os.path.exists(original_cookie_file):
                os.rename(original_cookie_file, original_cookie_file + ".bak")
            os.rename(cookie_file, original_cookie_file)
        
        from app.services.xueqiu_service import XueqiuService
        service = XueqiuService()
        statuses = service.get_user_statuses(data.user_id, data.status_type, data.count)
        
        return [
            {
                "id": s.id,
                "user_id": s.user_id,
                "text": s.text,
                "title": s.title,
                "link": s.link,
                "created_at": s.created_at,
                "retweet_count": s.retweet_count,
                "reply_count": s.reply_count,
                "like_count": s.like_count,
            }
            for s in statuses
        ]
    finally:
        # 恢复原始Cookie文件
        original_cookie_file = os.path.expanduser("~/.xueqiu_cookie")
        if os.path.exists(original_cookie_file + ".bak"):
            if os.path.exists(original_cookie_file):
                os.remove(original_cookie_file)
            os.rename(original_cookie_file + ".bak", original_cookie_file)


@router.post("/fetch-comments")
async def fetch_comments(data: FetchCommentsRequest):
    """获取用户评论/回复（使用前端提供的Cookie）"""
    import os
    
    cookie_file = os.path.expanduser("~/.xueqiu_cookie_temp")
    
    try:
        if data.cookie:
            with open(cookie_file, "w") as f:
                f.write(data.cookie)
            
            original_cookie_file = os.path.expanduser("~/.xueqiu_cookie")
            if os.path.exists(original_cookie_file):
                os.rename(original_cookie_file, original_cookie_file + ".bak")
            os.rename(cookie_file, original_cookie_file)
        
        from app.services.xueqiu_service import XueqiuService
        service = XueqiuService()
        comments = service.get_user_comments(data.user_id, data.count)
        
        return [
            {
                "id": c.id,
                "user_id": c.user_id,
                "text": c.text,
                "title": c.title,
                "link": c.link,
                "created_at": c.created_at,
                "retweet_count": c.retweet_count,
                "reply_count": c.reply_count,
                "like_count": c.like_count,
            }
            for c in comments
        ]
    finally:
        original_cookie_file = os.path.expanduser("~/.xueqiu_cookie")
        if os.path.exists(original_cookie_file + ".bak"):
            if os.path.exists(original_cookie_file):
                os.remove(original_cookie_file)
            os.rename(original_cookie_file + ".bak", original_cookie_file)


@router.get("/{vip_id}/statuses")
async def get_vip_statuses(
    vip_id: int,
    status_type: int = Query(0, description="动态类型: 0=原发布, 11=交易"),
    count: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """获取大V动态"""
    result = await db.execute(
        select(VIPUser).where(VIPUser.id == vip_id)
    )
    vip = result.scalar_one_or_none()
    
    if not vip:
        raise HTTPException(status_code=404, detail="大V不存在")
    
    # 实时爬取
    from app.services.xueqiu_service import XueqiuService
    service = XueqiuService()
    statuses = service.get_user_statuses(vip.xueqiu_id, status_type, count)
    
    return [
        {
            "id": s.id,
            "user_id": s.user_id,
            "text": s.text,
            "title": s.title,
            "link": s.link,
            "created_at": s.created_at,
            "retweet_count": s.retweet_count,
            "reply_count": s.reply_count,
            "like_count": s.like_count,
        }
        for s in statuses
    ]


# ============ 组合相关 ============

@router.get("/{vip_id}/portfolios")
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
    service = XueqiuService()
    portfolios = service.get_user_portfolios(vip.xueqiu_id)
    
    return [
        {
            "cube_id": p.cube_id,
            "name": p.name,
            "symbol": p.symbol,
            "net_value": p.net_value,
            "total_gain": p.total_gain,
        }
        for p in portfolios
    ]


@router.get("/{vip_id}/rebalancing/{cube_id}")
async def get_vip_rebalancing(
    vip_id: int,
    cube_id: str,
    count: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """获取组合调仓历史"""
    result = await db.execute(
        select(VIPUser).where(VIPUser.id == vip_id)
    )
    vip = result.scalar_one_or_none()
    
    if not vip:
        raise HTTPException(status_code=404, detail="大V不存在")
    
    # 实时爬取
    from app.services.xueqiu_service import XueqiuService
    service = XueqiuService()
    rebalancings = service.get_portfolio_rebalancing(cube_id, count)
    
    return [
        {
            "cube_id": r.cube_id,
            "title": r.title,
            "link": r.link,
            "description": r.description,
            "pub_date": r.pub_date,
        }
        for r in rebalancings
    ]