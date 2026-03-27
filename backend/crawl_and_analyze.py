#!/usr/bin/env python3
"""
定时抓取雪球大V动态并分析
用法: python crawl_and_analyze.py

使用 stock-analyzer skill 进行分析
"""

import os
import sys
import json
import asyncio
import time
import random
from datetime import datetime
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

# 添加 skill 路径
SKILL_PATH = Path(__file__).parent.parent.parent.parent / "skills" / "stock-analyzer" / "scripts"
if SKILL_PATH.exists():
    sys.path.insert(0, str(SKILL_PATH))

from app.services.xueqiu_service import XueqiuService
from app.core.database import get_db
from app.models.models import VIPUser, StatusAnalysis
from sqlalchemy import select

# 导入分析器
try:
    from analyze_text import analyze_text
    HAS_ANALYZER = True
except ImportError:
    print("⚠️  未找到 stock-analyzer skill")
    HAS_ANALYZER = False


async def crawl_and_analyze():
    """抓取并分析所有大V动态"""
    print(f"\n{'='*60}")
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 开始抓取和分析")
    print(f"{'='*60}")
    
    if not HAS_ANALYZER:
        print("❌ 未安装 stock-analyzer skill，无法分析")
        return
    
    # 初始化服务
    service = XueqiuService()
    
    if not service.has_cookie():
        print("❌ Cookie 未配置，请先设置 ~/.xueqiu_cookie")
        return
    
    # 获取数据库连接
    async for db in get_db():
        # 获取所有大V
        result = await db.execute(select(VIPUser))
        vips = result.scalars().all()
        
        print(f"\n📋 关注的大V: {len(vips)} 位")
        
        total_new = 0
        total_analyzed = 0
        
        for vip in vips:
            print(f"\n{'─'*50}")
            print(f"👤 {vip.nickname} (ID: {vip.xueqiu_id})")
            
            # 抓取最新动态
            statuses = service.get_user_statuses(vip.xueqiu_id, status_type=0, count=10)
            print(f"   抓取到 {len(statuses)} 条动态")
            
            for status in statuses:
                # 检查是否已分析
                existing = await db.execute(
                    select(StatusAnalysis).where(StatusAnalysis.status_id == status.id)
                )
                if existing.scalar_one_or_none():
                    continue
                
                # 分析动态
                print(f"\n   📝 分析: {status.text[:40]}...")
                
                # 使用 skill 分析
                analysis = analyze_text(status.text, status.title)
                
                if analysis.error:
                    print(f"      ❌ 分析失败: {analysis.error}")
                    continue
                
                # 保存分析结果
                saved = StatusAnalysis(
                    status_id=status.id,
                    user_id=vip.xueqiu_id,
                    core_viewpoint=analysis.core_viewpoint,
                    related_stocks=json.dumps([{
                        "name": s.name, 
                        "code": s.code, 
                        "attitude": s.attitude, 
                        "reason": s.reason
                    } for s in analysis.related_stocks]),
                    position_signals=json.dumps([{
                        "operation": p.operation, 
                        "stock": p.stock, 
                        "basis": p.basis
                    } for p in analysis.position_signals]),
                    key_logic=json.dumps(analysis.key_logic),
                    risk_warnings=json.dumps(analysis.risk_warnings),
                    overall_attitude=analysis.overall_attitude,
                    summary=analysis.summary,
                    raw_content=status.text[:1000]
                )
                db.add(saved)
                total_analyzed += 1
                
                # 打印结果
                print(f"      💡 观点: {analysis.core_viewpoint}")
                print(f"      📈 态度: {analysis.overall_attitude} (置信度: {analysis.confidence:.0%})")
                
                if analysis.related_stocks:
                    stocks_str = ", ".join([f"{s.name}({s.attitude})" for s in analysis.related_stocks])
                    print(f"      📊 股票: {stocks_str}")
                
                # 随机延迟避免限流
                delay = random.uniform(1.5, 3.0)
                time.sleep(delay)
            
            total_new += len(statuses)
        
        await db.commit()
        
        print(f"\n{'='*60}")
        print(f"📊 本次统计:")
        print(f"   • 抓取动态: {total_new} 条")
        print(f"   • 新分析: {total_analyzed} 条")
        print(f"{'='*60}\n")


if __name__ == "__main__":
    asyncio.run(crawl_and_analyze())