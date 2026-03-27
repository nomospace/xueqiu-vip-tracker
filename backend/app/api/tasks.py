"""
任务管理 API - 按需爬取
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import VIPUser

router = APIRouter()


class CrawlResult(BaseModel):
    vip_id: int
    success: bool
    user_info: Optional[dict] = None
    statuses_count: int = 0
    error: Optional[str] = None


@router.post("/crawl/{vip_id}", response_model=CrawlResult)
async def crawl_vip(
    vip_id: int,
    db: AsyncSession = Depends(get_db)
):
    """爬取指定大V数据"""
    # 获取大V信息
    result = await db.execute(
        select(VIPUser).where(VIPUser.id == vip_id)
    )
    vip = result.scalar_one_or_none()
    
    if not vip:
        raise HTTPException(status_code=404, detail="大V不存在")
    
    # 执行爬取
    from app.services.xueqiu_service import crawl_vip
    
    try:
        crawl_result = crawl_vip(vip.xueqiu_id)
        
        # 更新大V信息
        if crawl_result.get("success") and crawl_result.get("user_info"):
            user_info = crawl_result["user_info"]
            vip.nickname = user_info.get("screen_name") or vip.nickname
            vip.followers = user_info.get("followers_count") or vip.followers
            vip.avatar = user_info.get("avatar") or vip.avatar
            vip.description = user_info.get("description") or vip.description
            await db.commit()
        
        return CrawlResult(
            vip_id=vip_id,
            success=crawl_result.get("success", False),
            user_info=crawl_result.get("user_info"),
            statuses_count=len(crawl_result.get("statuses", [])),
            error=crawl_result.get("error"),
        )
    except Exception as e:
        return CrawlResult(
            vip_id=vip_id,
            success=False,
            error=str(e),
        )