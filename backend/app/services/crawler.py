"""
雪球爬虫服务
"""

import httpx
from bs4 import BeautifulSoup
from typing import Optional, Dict, List
import json
import asyncio
from datetime import datetime


class XueqiuCrawler:
    """雪球数据爬虫"""
    
    BASE_URL = "https://xueqiu.com"
    
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
        }
        # 需要有效的Cookie才能访问API
        self.cookies = {}
    
    def set_cookies(self, cookies: Dict[str, str]):
        """设置Cookie"""
        self.cookies = cookies
    
    async def get_user_info(self, user_id: str) -> Optional[Dict]:
        """
        获取用户信息
        
        Args:
            user_id: 雪球用户ID
            
        Returns:
            用户信息字典
        """
        url = f"{self.BASE_URL}/v4/statuses/user_timeline.json"
        params = {
            "user_id": user_id,
            "page": 1,
            "count": 1
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    params=params,
                    headers=self.headers,
                    cookies=self.cookies,
                    timeout=30
                )
                response.raise_for_status()
                data = response.json()
                
                if data.get("statuses"):
                    user = data["statuses"][0].get("user", {})
                    return {
                        "xueqiu_id": user_id,
                        "nickname": user.get("screen_name", ""),
                        "avatar": user.get("profile_image_url", ""),
                        "followers": user.get("followers_count", 0),
                        "description": user.get("description", ""),
                    }
            except Exception as e:
                print(f"获取用户信息失败: {e}")
        
        return None
    
    async def get_user_posts(
        self, 
        user_id: str, 
        page: int = 1, 
        count: int = 20
    ) -> List[Dict]:
        """
        获取用户动态
        
        Args:
            user_id: 雪球用户ID
            page: 页码
            count: 每页数量
            
        Returns:
            动态列表
        """
        url = f"{self.BASE_URL}/v4/statuses/user_timeline.json"
        params = {
            "user_id": user_id,
            "page": page,
            "count": count
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    params=params,
                    headers=self.headers,
                    cookies=self.cookies,
                    timeout=30
                )
                response.raise_for_status()
                data = response.json()
                
                posts = []
                for status in data.get("statuses", []):
                    posts.append({
                        "post_id": str(status.get("id", "")),
                        "type": "post",
                        "content": status.get("text", ""),
                        "images": json.dumps(status.get("photos", [])),
                        "likes": status.get("like_count", 0),
                        "comments": status.get("reply_count", 0),
                        "created_at": datetime.fromtimestamp(
                            status.get("created_at", 0) / 1000
                        ),
                    })
                
                return posts
            except Exception as e:
                print(f"获取用户动态失败: {e}")
        
        return []
    
    async def get_user_portfolio(self, user_id: str) -> Optional[Dict]:
        """
        获取用户持仓组合
        
        注意：需要用户公开了组合才能获取
        
        Args:
            user_id: 雪球用户ID
            
        Returns:
            持仓信息
        """
        # 雪球组合API需要登录态
        url = f"{self.BASE_URL}/cubes/rebalancing/history.json"
        params = {
            "cube_symbol": f"ZH{user_id}",  # 假设组合ID
            "count": 20,
            "page": 1
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    params=params,
                    headers=self.headers,
                    cookies=self.cookies,
                    timeout=30
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                print(f"获取用户持仓失败: {e}")
        
        return None


# 创建全局实例
crawler = XueqiuCrawler()


async def crawl_vip_user(user_id: str) -> Optional[Dict]:
    """爬取大V信息"""
    return await crawler.get_user_info(user_id)


async def crawl_vip_posts(user_id: str) -> List[Dict]:
    """爬取大V动态"""
    return await crawler.get_user_posts(user_id)


async def crawl_vip_holdings(user_id: str) -> Optional[Dict]:
    """爬取大V持仓"""
    return await crawler.get_user_portfolio(user_id)