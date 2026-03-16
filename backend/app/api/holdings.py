"""
持仓监控 API
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal

from app.core.database import get_db
from app.models.models import VIPHolding, HoldingChange

router = APIRouter()


class HoldingResponse(BaseModel):
    id: int
    vip_id: int
    stock_code: str
    stock_name: str
    position: Decimal
    updated_at: datetime

    class Config:
        from_attributes = True


class ChangeResponse(BaseModel):
    id: int
    vip_id: int
    stock_code: str
    stock_name: str
    change_type: str
    old_position: Decimal | None
    new_position: Decimal | None
    change_percent: Decimal | None
    detected_at: datetime

    class Config:
        from_attributes = True


@router.get("/{vip_id}", response_model=List[HoldingResponse])
async def get_vip_holdings(
    vip_id: int,
    db: AsyncSession = Depends(get_db)
):
    """获取大V持仓"""
    result = await db.execute(
        select(VIPHolding)
        .where(VIPHolding.vip_id == vip_id)
        .order_by(desc(VIPHolding.position))
    )
    return result.scalars().all()


@router.get("/changes", response_model=List[ChangeResponse])
async def get_holding_changes(
    vip_id: int | None = None,
    stock_code: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """获取持仓变动历史"""
    query = select(HoldingChange).order_by(desc(HoldingChange.detected_at))
    
    if vip_id:
        query = query.where(HoldingChange.vip_id == vip_id)
    
    if stock_code:
        query = query.where(HoldingChange.stock_code == stock_code)
    
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()