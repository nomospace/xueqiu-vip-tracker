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


class FetchHoldingsRequest(BaseModel):
    cookie: str = ""


class AnalyzeRequest(BaseModel):
    text: str
    title: str = ""


@router.post("/analyze")
async def analyze_content(data: AnalyzeRequest):
    """AI分析大V发言内容"""
    import httpx
    
    if not data.text:
        return {"error": "内容为空"}
    
    # 构建分析提示词
    prompt = f"""请分析以下雪球大V发言内容，提取关键信息：

标题：{data.title or '无'}
内容：{data.text[:2000]}

请按以下格式输出（JSON格式，使用英文字段名）：

{{
  "coreViewpoint": "一句话概括核心观点",
  "relatedStocks": [
    {{"name": "股票名称", "code": "股票代码", "attitude": "看多/看空/中性/观望", "reason": "简要理由"}}
  ],
  "positionSignals": [
    {{"operation": "新增/加仓/减仓/清仓", "stock": "股票名称", "basis": "原文依据"}}
  ],
  "keyLogic": ["逻辑点1", "逻辑点2"],
  "riskWarnings": ["风险点1"],
  "overallAttitude": "整体看多/看空/中性/观望",
  "summary": "100字以内的精炼总结"
}}

注意：
1. 只基于原文内容分析，不要虚构信息
2. 识别雪球常用术语如"宁王"=宁德时代、"茅指数"=贵州茅台等
3. 如果原文没有明确提及股票，relatedStocks数组为空
4. 态度要客观，不要过度解读"""

    try:
        # 调用本地AI模型（通过OpenAI兼容接口）
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.dashscope.cn/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {os.environ.get('DASHSCOPE_API_KEY', '')}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "qwen-turbo",
                    "messages": [
                        {"role": "system", "content": "你是一位专业的金融分析师，擅长解读雪球大V发言。请严格基于原文内容进行分析，不要虚构信息。"},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1000
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                # 尝试解析JSON
                import json
                import re
                
                # 提取JSON部分
                json_match = re.search(r'\{[\s\S]*\}', content)
                if json_match:
                    try:
                        analysis = json.loads(json_match.group())
                        return analysis
                    except:
                        pass
                
                # 如果无法解析JSON，返回原始内容
                return {"raw_analysis": content}
            else:
                return {"error": f"AI分析失败: {response.status_code}"}
                
    except Exception as e:
        return {"error": f"分析出错: {str(e)}"}


@router.post("/fetch-holdings")
async def fetch_all_holdings(
    data: FetchHoldingsRequest,
    db: AsyncSession = Depends(get_db)
):
    """获取所有大V的持仓变更"""
    import os
    
    # 获取所有关注的大V
    result = await db.execute(select(VIPUser))
    vips = result.scalars().all()
    
    if not vips:
        return []
    
    # 使用前端传递的Cookie
    cookie_file = os.path.expanduser("~/.xueqiu_cookie_temp")
    original_cookie_file = os.path.expanduser("~/.xueqiu_cookie")
    
    all_holdings = []
    
    try:
        if data.cookie:
            with open(cookie_file, "w") as f:
                f.write(data.cookie)
            if os.path.exists(original_cookie_file):
                os.rename(original_cookie_file, original_cookie_file + ".bak")
            os.rename(cookie_file, original_cookie_file)
        
        from app.services.xueqiu_service import XueqiuService
        service = XueqiuService()
        
        for vip in vips:
            try:
                # 获取用户组合
                portfolios = service.get_user_portfolios(vip.xueqiu_id)
                
                for p in portfolios[:2]:  # 每个大V只取前2个组合
                    # 获取调仓历史
                    rebalancings = service.get_portfolio_rebalancing(p.symbol, 5)
                    
                    for r in rebalancings:
                        # 解析调仓记录中的持仓变更
                        if r.description:
                            # description 包含调仓详情，解析股票操作
                            import re
                            # 匹配格式如：买入 $贵州茅台(SH600519)$ 
                            # 或：卖出 $宁德时代(SZ300750)$
                            
                            # 简单解析：查找股票代码和操作
                            stocks = re.findall(r'\$([^$]+)\(([A-Z0-9]+)\)\$', r.description)
                            
                            for stock_name, stock_code in stocks:
                                # 判断操作类型
                                operation = '加仓'
                                if '卖出' in r.description or '清仓' in r.description:
                                    operation = '减仓' if '卖出' in r.description else '清仓'
                                elif '买入' in r.description or '新建' in r.description:
                                    operation = '新增' if '新建' in r.description else '加仓'
                                
                                all_holdings.append({
                                    "stock_code": stock_code,
                                    "stock_name": stock_name,
                                    "operation": operation,
                                    "vip_nickname": vip.nickname,
                                    "vip_id": vip.id,
                                    "created_at": r.pub_date,
                                    "portfolio_name": p.name,
                                })
            except Exception as e:
                print(f"获取 {vip.nickname} 持仓失败: {e}")
                continue
        
        # 按时间排序
        all_holdings.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return all_holdings[:50]  # 返回最近50条
        
    finally:
        if os.path.exists(original_cookie_file + ".bak"):
            if os.path.exists(original_cookie_file):
                os.remove(original_cookie_file)
            os.rename(original_cookie_file + ".bak", original_cookie_file)