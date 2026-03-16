"""
动态监听 API
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.models.models import VIPPost

router = APIRouter()


class PostResponse(BaseModel):
    id: int
    vip_id: int
    post_id: str
    type: str
    content: str | None
    likes: int
    comments: int
    created_at: datetime | None

    class Config:
        from_attributes = True


@router.get("", response_model=List[PostResponse])
async def get_posts(
    vip_id: int | None = None,
    post_type: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """获取动态列表"""
    query = select(VIPPost).order_by(desc(VIPPost.created_at))
    
    if vip_id:
        query = query.where(VIPPost.vip_id == vip_id)
    
    if post_type:
        query = query.where(VIPPost.type == post_type)
    
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{post_id}", response_model=PostResponse)
async def get_post_detail(
    post_id: int,
    db: AsyncSession = Depends(get_db)
):
    """获取动态详情"""
    result = await db.execute(
        select(VIPPost).where(VIPPost.id == post_id)
    )
    return result.scalar_one_or_none()