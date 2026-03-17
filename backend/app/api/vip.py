"""
脱水雪球 - 大V管理 API
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
import os
import json

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




# ============ AI 分析相关 ============

@router.get("/analyses")
async def get_analyses(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """获取所有 AI 分析结果"""
    from app.models.models import StatusAnalysis
    
    result = await db.execute(
        select(StatusAnalysis).order_by(StatusAnalysis.created_at.desc()).offset(skip).limit(limit)
    )
    analyses = result.scalars().all()
    
    enriched = []
    for a in analyses:
        vip_result = await db.execute(
            select(VIPUser).where(VIPUser.xueqiu_id == a.user_id)
        )
        vip = vip_result.scalar_one_or_none()
        
        enriched.append({
            "id": a.id, "status_id": a.status_id, "user_id": a.user_id,
            "vip_nickname": vip.nickname if vip else None,
            "core_viewpoint": a.core_viewpoint,
            "related_stocks": json.loads(a.related_stocks) if a.related_stocks else [],
            "position_signals": json.loads(a.position_signals) if a.position_signals else [],
            "key_logic": json.loads(a.key_logic) if a.key_logic else [],
            "risk_warnings": json.loads(a.risk_warnings) if a.risk_warnings else [],
            "overall_attitude": a.overall_attitude, "summary": a.summary,
            "raw_content": a.raw_content,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })
    
    return enriched


@router.post("/analyze-all")
async def analyze_all_vips(db: AsyncSession = Depends(get_db)):
    """分析所有大V的最新动态 - 10分钟缓存"""
    import sys
    from datetime import datetime
    from pathlib import Path
    
    # 检查缓存
    cache_key = f"analyze_{get_cache_key_10min()}"
    if cache_key in _daily_summary_cache:
        cached = _daily_summary_cache[cache_key]
        return {
            "cached": True, 
            "analyzed": cached.get("analyzed", 0), 
            "message": "使用缓存数据（10分钟内有效）"
        }
    
    SKILL_PATH = Path(__file__).parent.parent.parent.parent.parent / "skills" / "stock-analyzer" / "scripts"
    if SKILL_PATH.exists():
        sys.path.insert(0, str(SKILL_PATH))
    
    try:
        from analyze_text import analyze_text
        HAS_ANALYZER = True
    except ImportError:
        HAS_ANALYZER = False
    
    if not HAS_ANALYZER:
        return {"error": "未安装 stock-analyzer skill"}
    
    from app.services.xueqiu_service import XueqiuService
    from app.models.models import StatusAnalysis
    
    service = XueqiuService()
    if not service.has_cookie():
        return {"error": "Cookie 未配置"}
    
    result = await db.execute(select(VIPUser))
    vips = result.scalars().all()
    total_analyzed = 0
    
    for vip in vips:
        statuses = service.get_user_statuses(vip.xueqiu_id, status_type=0, count=5)
        for status in statuses:
            existing = await db.execute(select(StatusAnalysis).where(StatusAnalysis.status_id == status.id))
            if existing.scalar_one_or_none():
                continue
            analysis = analyze_text(status.text, status.title)
            if analysis.error:
                continue
            saved = StatusAnalysis(
                status_id=status.id, user_id=vip.xueqiu_id,
                core_viewpoint=analysis.core_viewpoint,
                related_stocks=json.dumps([{"name": s.name, "code": s.code, "attitude": s.attitude, "reason": s.reason} for s in analysis.related_stocks]),
                position_signals=json.dumps([{"operation": p.operation, "stock": p.stock, "basis": p.basis} for p in analysis.position_signals]),
                key_logic=json.dumps(analysis.key_logic),
                risk_warnings=json.dumps(analysis.risk_warnings),
                overall_attitude=analysis.overall_attitude,
                summary=analysis.summary, raw_content=status.text[:1000]
            )
            db.add(saved)
            total_analyzed += 1
        await db.commit()
    
    # 缓存结果
    _daily_summary_cache[cache_key] = {
        "analyzed": total_analyzed,
        "cached_at": datetime.now()
    }
    
    return {"cached": False, "analyzed": total_analyzed, "message": f"成功分析 {total_analyzed} 条动态"}


# ============ 执行摘要相关 ============

@router.get("/daily-summary")
async def get_daily_summary(
    date: str = None,
    db: AsyncSession = Depends(get_db)
):
    """获取每日执行摘要"""
    from datetime import datetime, timedelta
    from app.models.models import StatusAnalysis
    
    if date:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    else:
        target_date = datetime.now()
    
    start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    
    result = await db.execute(select(VIPUser))
    vips = result.scalars().all()
    summaries = []
    
    for vip in vips:
        analyses_result = await db.execute(
            select(StatusAnalysis)
            .where(StatusAnalysis.user_id == vip.xueqiu_id)
            .where(StatusAnalysis.created_at >= start_of_day)
            .where(StatusAnalysis.created_at < end_of_day)
            .order_by(StatusAnalysis.created_at)
        )
        analyses = analyses_result.scalars().all()
        if not analyses:
            continue
        
        emotion_trajectory = []
        for a in analyses:
            emotion_trajectory.append({
                "time": a.created_at.strftime("%H:%M") if a.created_at else "",
                "content": (a.raw_content or "")[:200],
                "attitude": a.overall_attitude,
                "viewpoint": a.core_viewpoint
            })
        
        emotion_change = ""
        if len(emotion_trajectory) >= 2:
            first = emotion_trajectory[0].get("attitude", "中性")
            last = emotion_trajectory[-1].get("attitude", "中性")
            emotion_change = f'从"{first}"→"{last}"' if first != last else f"保持{first}"
        elif len(emotion_trajectory) == 1:
            emotion_change = emotion_trajectory[0].get("attitude", "中性")
        
        key_findings = [a.core_viewpoint for a in analyses if a.core_viewpoint][:3]
        all_stocks = []
        for a in analyses:
            stocks = json.loads(a.related_stocks) if a.related_stocks else []
            all_stocks.extend(stocks)
        
        core_insight = f"{vip.nickname}发布{len(analyses)}条动态，情绪{emotion_change}。"
        
        summaries.append({
            "vip_id": vip.id, "vip_nickname": vip.nickname, "xueqiu_id": vip.xueqiu_id,
            "post_count": len(analyses), "emotion_change": emotion_change,
            "emotion_trajectory": emotion_trajectory, "key_findings": key_findings,
            "related_stocks": all_stocks[:5], "core_insight": core_insight
        })
    
    return {
        "date": target_date.strftime("%Y-%m-%d"),
        "collect_time": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "total_vips": len(summaries), "total_posts": sum(s["post_count"] for s in summaries),
        "summaries": summaries
    }



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
async def fetch_statuses(data: FetchStatusesRequest, db: AsyncSession = Depends(get_db)):
    """获取用户动态（使用前端提供的Cookie）- 自动分析并缓存"""
    import os
    import json
    
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
        from app.models.models import StatusAnalysis
        
        service = XueqiuService()
        statuses = service.get_user_statuses(data.user_id, data.status_type, data.count)
        
        # 获取 API Key
        api_key = os.environ.get("DASHSCOPE_API_KEY", "")
        
        # 批量分析所有动态
        result = []
        for s in statuses:
            status_data = {
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
            
            # 检查缓存
            cached_result = await db.execute(
                select(StatusAnalysis).where(StatusAnalysis.status_id == s.id)
            )
            cached = cached_result.scalar_one_or_none()
            
            if cached:
                # 使用缓存
                status_data["analysis"] = {
                    "coreViewpoint": cached.core_viewpoint,
                    "relatedStocks": json.loads(cached.related_stocks) if cached.related_stocks else [],
                    "positionSignals": json.loads(cached.position_signals) if cached.position_signals else [],
                    "keyLogic": json.loads(cached.key_logic) if cached.key_logic else [],
                    "riskWarnings": json.loads(cached.risk_warnings) if cached.risk_warnings else [],
                    "overallAttitude": cached.overall_attitude,
                    "summary": cached.summary,
                    "_cached": True
                }
            elif api_key and s.text:
                # 调用 AI 分析
                try:
                    analysis = await _analyze_text(s.text, s.title, api_key)
                    # 保存到数据库
                    saved = StatusAnalysis(
                        status_id=s.id,
                        user_id=s.user_id,
                        core_viewpoint=analysis.get("coreViewpoint", ""),
                        related_stocks=json.dumps(analysis.get("relatedStocks", [])),
                        position_signals=json.dumps(analysis.get("positionSignals", [])),
                        key_logic=json.dumps(analysis.get("keyLogic", [])),
                        risk_warnings=json.dumps(analysis.get("riskWarnings", [])),
                        overall_attitude=analysis.get("overallAttitude", "中性"),
                        summary=analysis.get("summary", ""),
                        raw_content=s.text[:1000]
                    )
                    db.add(saved)
                    await db.commit()
                    
                    status_data["analysis"] = analysis
                except Exception as e:
                    status_data["analysis"] = {"error": f"分析失败: {str(e)}"}
            else:
                status_data["analysis"] = None
            
            result.append(status_data)
        
        return result
    finally:
        # 恢复原始Cookie文件
        original_cookie_file = os.path.expanduser("~/.xueqiu_cookie")
        if os.path.exists(original_cookie_file + ".bak"):
            if os.path.exists(original_cookie_file):
                os.remove(original_cookie_file)
            os.rename(original_cookie_file + ".bak", original_cookie_file)


async def _analyze_text(text: str, title: str, api_key: str) -> dict:
    """调用 AI 分析文本"""
    import httpx
    import json
    import re
    
    prompt = f"""请分析以下雪球大V发言内容，提取关键信息：

标题：{title or '无'}
内容：{text[:2000]}

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

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "qwen-turbo",
                "input": {
                    "messages": [
                        {"role": "system", "content": "你是一位专业的金融分析师，擅长解读雪球大V发言。请严格基于原文内容进行分析，不要虚构信息。输出必须是纯JSON格式，不要包含markdown代码块标记。"},
                        {"role": "user", "content": prompt}
                    ]
                },
                "parameters": {
                    "temperature": 0.3,
                    "max_tokens": 1000
                }
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            output = result.get("output", {})
            content = output.get("text", "")
            
            if not content:
                choices = result.get("choices", [])
                if choices:
                    content = choices[0].get("message", {}).get("content", "")
            
            # 提取JSON部分
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except:
                    pass
            
            return {
                "coreViewpoint": content[:200] if content else "分析完成",
                "relatedStocks": [],
                "positionSignals": [],
                "keyLogic": [],
                "riskWarnings": [],
                "overallAttitude": "中性",
                "summary": content[:100] if content else ""
            }
        else:
            return {"error": f"AI分析失败 ({response.status_code})"}


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
    status_id: str = ""  # 动态ID，用于缓存


@router.post("/analyze")
async def analyze_content(
    data: AnalyzeRequest,
    db: AsyncSession = Depends(get_db)
):
    """AI分析大V发言内容"""
    import httpx
    import os
    import json
    
    if not data.text:
        return {"error": "内容为空"}
    
    # 如果有 status_id，先查询缓存
    if data.status_id:
        from app.models.models import StatusAnalysis
        result = await db.execute(
            select(StatusAnalysis).where(StatusAnalysis.status_id == data.status_id)
        )
        cached = result.scalar_one_or_none()
        
        if cached:
            # 返回缓存的结果
            return {
                "coreViewpoint": cached.core_viewpoint,
                "relatedStocks": json.loads(cached.related_stocks) if cached.related_stocks else [],
                "positionSignals": json.loads(cached.position_signals) if cached.position_signals else [],
                "keyLogic": json.loads(cached.key_logic) if cached.key_logic else [],
                "riskWarnings": json.loads(cached.risk_warnings) if cached.risk_warnings else [],
                "overallAttitude": cached.overall_attitude,
                "summary": cached.summary,
                "_cached": True
            }
    
    # 检查 API Key
    api_key = os.environ.get("DASHSCOPE_API_KEY", "")
    if not api_key:
        # 返回默认分析结果（无 AI）
        return {
            "coreViewpoint": "请配置 DASHSCOPE_API_KEY 环境变量以启用 AI 分析",
            "relatedStocks": [],
            "positionSignals": [],
            "keyLogic": [],
            "riskWarnings": [],
            "overallAttitude": "中性",
            "summary": "AI 分析功能需要配置通义千问 API Key。请设置环境变量 DASHSCOPE_API_KEY。"
        }
    
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
        # 调用通义千问 API
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "qwen-turbo",
                    "input": {
                        "messages": [
                            {"role": "system", "content": "你是一位专业的金融分析师，擅长解读雪球大V发言。请严格基于原文内容进行分析，不要虚构信息。输出必须是纯JSON格式，不要包含markdown代码块标记。"},
                            {"role": "user", "content": prompt}
                        ]
                    },
                    "parameters": {
                        "temperature": 0.3,
                        "max_tokens": 1000
                    }
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # 解析通义千问的响应格式
                output = result.get("output", {})
                content = output.get("text", "")
                
                # 如果没有 text，尝试其他字段
                if not content:
                    choices = result.get("choices", [])
                    if choices:
                        content = choices[0].get("message", {}).get("content", "")
                
                # 尝试解析JSON
                import json
                import re
                
                # 提取JSON部分
                json_match = re.search(r'\{[\s\S]*\}', content)
                analysis = {}
                
                if json_match:
                    try:
                        analysis = json.loads(json_match.group())
                    except:
                        analysis = {
                            "coreViewpoint": content[:200] if content else "分析完成",
                            "relatedStocks": [],
                            "positionSignals": [],
                            "keyLogic": [],
                            "riskWarnings": [],
                            "overallAttitude": "中性",
                            "summary": content[:100] if content else "AI 分析完成"
                        }
                else:
                    analysis = {
                        "coreViewpoint": content[:200] if content else "分析完成",
                        "relatedStocks": [],
                        "positionSignals": [],
                        "keyLogic": [],
                        "riskWarnings": [],
                        "overallAttitude": "中性",
                        "summary": content[:100] if content else "AI 分析完成"
                    }
                
                # 保存到数据库
                if data.status_id:
                    from app.models.models import StatusAnalysis
                    saved = StatusAnalysis(
                        status_id=data.status_id,
                        user_id="",  # 可以后续从上下文获取
                        core_viewpoint=analysis.get("coreViewpoint", ""),
                        related_stocks=json.dumps(analysis.get("relatedStocks", [])),
                        position_signals=json.dumps(analysis.get("positionSignals", [])),
                        key_logic=json.dumps(analysis.get("keyLogic", [])),
                        risk_warnings=json.dumps(analysis.get("riskWarnings", [])),
                        overall_attitude=analysis.get("overallAttitude", "中性"),
                        summary=analysis.get("summary", ""),
                        raw_content=data.text[:1000]
                    )
                    db.add(saved)
                    await db.commit()
                
                return analysis
            else:
                error_detail = response.text[:200] if response.text else "未知错误"
                return {"error": f"AI分析失败 ({response.status_code}): {error_detail}"}
                
    except httpx.TimeoutException:
        return {"error": "AI 分析超时，请稍后重试"}
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

# ============ 缓存管理 ============

# 简单的内存缓存
_daily_summary_cache = {}

def get_cache_key_10min(date_str: str = None) -> str:
    """生成 10 分钟颗粒的缓存键"""
    from datetime import datetime
    now = datetime.now()
    # 计算当前是第几个 10 分钟段 (0-143)
    minute_slot = (now.hour * 60 + now.minute) // 10
    date_part = date_str or now.strftime("%Y-%m-%d")
    return f"{date_part}_{minute_slot:03d}"

@router.post("/refresh-summary")
async def refresh_daily_summary(
    date: str = None,
    db: AsyncSession = Depends(get_db)
):
    """刷新每日摘要（重新抓取和分析）- 10分钟缓存"""
    import sys
    from datetime import datetime, timedelta
    from pathlib import Path
    from app.models.models import StatusAnalysis
    
    # 解析日期
    if date:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    else:
        target_date = datetime.now()
    
    # 使用 10 分钟颗粒的缓存键
    cache_key = get_cache_key_10min(date)
    
    # 检查缓存（10 分钟有效）
    if cache_key in _daily_summary_cache:
        cached = _daily_summary_cache[cache_key]
        return {"cached": True, "data": cached["data"], "message": "使用缓存数据（10分钟内有效）"}
    
    # 添加 skill 路径
    SKILL_PATH = Path(__file__).parent.parent.parent.parent.parent / "skills" / "stock-analyzer" / "scripts"
    if SKILL_PATH.exists():
        sys.path.insert(0, str(SKILL_PATH))
    
    try:
        from analyze_text import analyze_text
        HAS_ANALYZER = True
    except ImportError:
        HAS_ANALYZER = False
    
    if not HAS_ANALYZER:
        return {"error": "未安装 stock-analyzer skill"}
    
    from app.services.xueqiu_service import XueqiuService
    
    service = XueqiuService()
    if not service.has_cookie():
        return {"error": "Cookie 未配置"}
    
    # 抓取所有大V最新动态
    result = await db.execute(select(VIPUser))
    vips = result.scalars().all()
    
    total_new = 0
    total_analyzed = 0
    
    for vip in vips:
        # 抓取最新动态
        statuses = service.get_user_statuses(vip.xueqiu_id, status_type=0, count=10)
        total_new += len(statuses)
        
        for status in statuses:
            # 检查是否已分析
            existing = await db.execute(
                select(StatusAnalysis).where(StatusAnalysis.status_id == status.id)
            )
            if existing.scalar_one_or_none():
                continue
            
            # 分析
            analysis = analyze_text(status.text, status.title)
            
            if analysis.error:
                continue
            
            # 保存
            saved = StatusAnalysis(
                status_id=status.id,
                user_id=vip.xueqiu_id,
                core_viewpoint=analysis.core_viewpoint,
                related_stocks=json.dumps([{
                    "name": s.name, "code": s.code,
                    "attitude": s.attitude, "reason": s.reason
                } for s in analysis.related_stocks]),
                position_signals=json.dumps([{
                    "operation": p.operation, "stock": p.stock, "basis": p.basis
                } for p in analysis.position_signals]),
                key_logic=json.dumps(analysis.key_logic),
                risk_warnings=json.dumps(analysis.risk_warnings),
                overall_attitude=analysis.overall_attitude,
                summary=analysis.summary,
                raw_content=status.text[:1000]
            )
            db.add(saved)
            total_analyzed += 1
        
        await db.commit()
    
    # 生成摘要数据
    start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    
    summaries = []
    for vip in vips:
        analyses_result = await db.execute(
            select(StatusAnalysis)
            .where(StatusAnalysis.user_id == vip.xueqiu_id)
            .where(StatusAnalysis.created_at >= start_of_day)
            .where(StatusAnalysis.created_at < end_of_day)
            .order_by(StatusAnalysis.created_at)
        )
        analyses = analyses_result.scalars().all()
        if not analyses:
            continue
        
        emotion_trajectory = []
        for a in analyses:
            emotion_trajectory.append({
                "time": a.created_at.strftime("%H:%M") if a.created_at else "",
                "content": (a.raw_content or "")[:200],
                "attitude": a.overall_attitude,
                "viewpoint": a.core_viewpoint
            })
        
        emotion_change = ""
        if len(emotion_trajectory) >= 2:
            first = emotion_trajectory[0].get("attitude", "中性")
            last = emotion_trajectory[-1].get("attitude", "中性")
            emotion_change = f'从"{first}"→"{last}"' if first != last else f"保持{first}"
        elif len(emotion_trajectory) == 1:
            emotion_change = emotion_trajectory[0].get("attitude", "中性")
        
        key_findings = [a.core_viewpoint for a in analyses if a.core_viewpoint][:3]
        all_stocks = []
        for a in analyses:
            stocks = json.loads(a.related_stocks) if a.related_stocks else []
            all_stocks.extend(stocks)
        
        core_insight = f"{vip.nickname}发布{len(analyses)}条动态，情绪{emotion_change}。"
        
        summaries.append({
            "vip_id": vip.id, "vip_nickname": vip.nickname, "xueqiu_id": vip.xueqiu_id,
            "post_count": len(analyses), "emotion_change": emotion_change,
            "emotion_trajectory": emotion_trajectory, "key_findings": key_findings,
            "related_stocks": all_stocks[:5], "core_insight": core_insight
        })
    
    summary_data = {
        "date": target_date.strftime("%Y-%m-%d"),
        "collect_time": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "total_vips": len(summaries),
        "total_posts": sum(s["post_count"] for s in summaries),
        "summaries": summaries
    }
    
    # 缓存结果
    _daily_summary_cache[cache_key] = {
        "data": summary_data,
        "cached_at": datetime.now()
    }
    
    return {
        "cached": False,
        "data": summary_data,
        "new_posts": total_new,
        "new_analyzed": total_analyzed,
        "message": f"刷新成功，新增 {total_new} 条动态，分析 {total_analyzed} 条"
    }


# ============ 聚合接口 ============

class FetchAllStatusesRequest(BaseModel):
    """聚合请求"""
    vip_ids: list = []  # 可选，指定大V ID 列表，空则获取所有
    count: int = 10  # 每种类型数量
    cookie: str = ""
    force_refresh: bool = False  # 强制刷新


@router.post("/fetch-all-timeline")
async def fetch_all_timeline(
    data: FetchAllStatusesRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    聚合获取所有大V的时间线数据（原发布 + 交易动态 + 评论回复）
    
    缓存策略:
    - 没数据 → 重新拉取
    - 10分钟内有缓存 → 返回缓存
    - 超过10分钟 → 拉增量数据并更新缓存
    """
    import os
    import sys
    from datetime import datetime, timedelta
    from pathlib import Path
    from app.services.xueqiu_service import XueqiuService
    from app.models.models import StatusAnalysis
    
    # 生成缓存键（基于请求参数 + 10分钟时间槽）
    cache_key = f"timeline_{','.join(map(str, sorted(data.vip_ids))) if data.vip_ids else 'all'}_{get_cache_key_10min()}"
    
    # 检查内存缓存（10分钟有效）
    if not data.force_refresh and cache_key in _daily_summary_cache:
        cached = _daily_summary_cache[cache_key]
        cached_data = cached["data"]
        cached_data["_cached"] = True
        cached_data["_cache_time"] = cached["cached_at"].strftime("%Y-%m-%d %H:%M:%S")
        return cached_data
    
    # 检查数据库中是否有分析数据
    existing_count = await db.execute(select(StatusAnalysis))
    has_existing_data = len(existing_count.scalars().all()) > 0
    
    # 如果有数据且不是强制刷新，检查是否需要增量更新
    if has_existing_data and not data.force_refresh:
        # 返回现有的分析数据（后续会合并新数据）
        pass
    
    # 临时保存 Cookie
    cookie_file = os.path.expanduser("~/.xueqiu_cookie_temp")
    original_cookie_file = os.path.expanduser("~/.xueqiu_cookie")
    
    try:
        # 设置 Cookie
        if data.cookie:
            with open(cookie_file, "w") as f:
                f.write(data.cookie)
            if os.path.exists(original_cookie_file):
                os.rename(original_cookie_file, original_cookie_file + ".bak")
            os.rename(cookie_file, original_cookie_file)
        
        service = XueqiuService()
        
        # 获取所有大V
        if data.vip_ids:
            result = await db.execute(
                select(VIPUser).where(VIPUser.id.in_(data.vip_ids))
            )
        else:
            result = await db.execute(select(VIPUser))
        vips = result.scalars().all()
        
        all_statuses = []
        new_analyzed = 0
        
        for vip in vips:
            # 1. 时间线 - 原发布 (type=0)
            try:
                timeline = service.get_user_statuses(vip.xueqiu_id, status_type=0, count=data.count)
                for s in timeline:
                    all_statuses.append({
                        "id": s.id,
                        "user_id": s.user_id,
                        "text": s.text,
                        "title": s.title,
                        "link": s.link,
                        "created_at": s.created_at,
                        "retweet_count": s.retweet_count,
                        "reply_count": s.reply_count,
                        "like_count": s.like_count,
                        "vip_nickname": vip.nickname,
                        "vip_id": vip.id,
                        "data_type": "timeline"
                    })
            except Exception as e:
                print(f"获取 {vip.nickname} 时间线失败: {e}")
            
            # 2. 发言 - 交易动态 (type=11)
            try:
                posts = service.get_user_statuses(vip.xueqiu_id, status_type=11, count=data.count)
                for s in posts:
                    all_statuses.append({
                        "id": s.id,
                        "user_id": s.user_id,
                        "text": s.text,
                        "title": s.title,
                        "link": s.link,
                        "created_at": s.created_at,
                        "retweet_count": s.retweet_count,
                        "reply_count": s.reply_count,
                        "like_count": s.like_count,
                        "vip_nickname": vip.nickname,
                        "vip_id": vip.id,
                        "data_type": "post"
                    })
            except Exception as e:
                print(f"获取 {vip.nickname} 发言失败: {e}")
            
            # 3. 评论回复
            try:
                comments = service.get_user_comments(vip.xueqiu_id, count=data.count)
                for s in comments:
                    all_statuses.append({
                        "id": s.id,
                        "user_id": s.user_id,
                        "text": s.text,
                        "title": s.title,
                        "link": s.link,
                        "created_at": s.created_at,
                        "retweet_count": s.retweet_count,
                        "reply_count": s.reply_count,
                        "like_count": s.like_count,
                        "vip_nickname": vip.nickname,
                        "vip_id": vip.id,
                        "data_type": "comment"
                    })
            except Exception as e:
                print(f"获取 {vip.nickname} 评论失败: {e}")
        
        # 去重：基于 id 去重
        seen_ids = set()
        unique_statuses = []
        for status in all_statuses:
            status_id = status.get("id")
            if status_id and status_id not in seen_ids:
                seen_ids.add(status_id)
                unique_statuses.append(status)
        
        # AI 分析并缓存
        SKILL_PATH = Path(__file__).parent.parent.parent.parent.parent / "skills" / "stock-analyzer" / "scripts"
        if SKILL_PATH.exists():
            sys.path.insert(0, str(SKILL_PATH))
        
        try:
            from analyze_text import analyze_text
            HAS_ANALYZER = True
        except ImportError:
            HAS_ANALYZER = False
        
        if HAS_ANALYZER:
            for status in unique_statuses:
                # 检查是否已有分析缓存
                existing = await db.execute(
                    select(StatusAnalysis).where(StatusAnalysis.status_id == status["id"])
                )
                cached_analysis = existing.scalar_one_or_none()
                
                if cached_analysis:
                    # 使用缓存的分析结果
                    status["analysis"] = {
                        "coreViewpoint": cached_analysis.core_viewpoint,
                        "relatedStocks": json.loads(cached_analysis.related_stocks) if cached_analysis.related_stocks else [],
                        "overallAttitude": cached_analysis.overall_attitude,
                        "summary": cached_analysis.summary,
                        "_cached": True
                    }
                else:
                    # 新分析
                    try:
                        analysis = analyze_text(status["text"], status.get("title", ""))
                        if not analysis.error:
                            # 保存到数据库
                            saved = StatusAnalysis(
                                status_id=status["id"],
                                user_id=status["user_id"],
                                core_viewpoint=analysis.core_viewpoint,
                                related_stocks=json.dumps([{
                                    "name": s.name, "code": s.code,
                                    "attitude": s.attitude, "reason": s.reason
                                } for s in analysis.related_stocks]),
                                position_signals=json.dumps([{
                                    "operation": p.operation, "stock": p.stock, "basis": p.basis
                                } for p in analysis.position_signals]),
                                key_logic=json.dumps(analysis.key_logic),
                                risk_warnings=json.dumps(analysis.risk_warnings),
                                overall_attitude=analysis.overall_attitude,
                                summary=analysis.summary,
                                raw_content=status["text"][:1000]
                            )
                            db.add(saved)
                            await db.commit()
                            new_analyzed += 1
                            
                            status["analysis"] = {
                                "coreViewpoint": analysis.core_viewpoint,
                                "relatedStocks": [{"name": s.name, "code": s.code, "attitude": s.attitude, "reason": s.reason} for s in analysis.related_stocks],
                                "overallAttitude": analysis.overall_attitude,
                                "summary": analysis.summary,
                                "_cached": False
                            }
                    except Exception as e:
                        print(f"分析失败: {e}")
        
        # 按时间倒序排列
        unique_statuses.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        result_data = {
            "total": len(unique_statuses),
            "vips_count": len(vips),
            "new_analyzed": new_analyzed,
            "statuses": unique_statuses,
            "_cached": False,
            "_cache_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        # 缓存结果
        _daily_summary_cache[cache_key] = {
            "data": result_data,
            "cached_at": datetime.now()
        }
        
        return result_data
        
    finally:
        # 恢复原始 Cookie
        if os.path.exists(original_cookie_file + ".bak"):
            if os.path.exists(original_cookie_file):
                os.remove(original_cookie_file)
            os.rename(original_cookie_file + ".bak", original_cookie_file)
