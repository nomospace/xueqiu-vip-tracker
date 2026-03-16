"""
雪球数据服务 - 使用Cookie认证
"""
import os
import httpx
from typing import Optional, List, Dict, Any
from datetime import datetime


class XueqiuService:
    """雪球数据服务"""
    
    def __init__(self):
        # 从环境变量读取cookie，不硬编码在代码中
        self.cookie = os.getenv("XUEQIU_COOKIE", "")
        self.base_url = "https://xueqiu.com"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Cookie": self.cookie
        }
    
    def set_cookie(self, cookie: str):
        """设置Cookie"""
        self.cookie = cookie
        self.headers["Cookie"] = cookie
        # 也可以保存到本地文件
        cookie_file = os.path.expanduser("~/.xueqiu_cookie")
        with open(cookie_file, "w") as f:
            f.write(cookie)
    
    def load_cookie_from_file(self) -> Optional[str]:
        """从本地文件加载Cookie"""
        cookie_file = os.path.expanduser("~/.xueqiu_cookie")
        if os.path.exists(cookie_file):
            with open(cookie_file, "r") as f:
                self.cookie = f.read().strip()
                self.headers["Cookie"] = self.cookie
                return self.cookie
        return None
    
    async def get_user_info(self, user_id: str) -> Optional[Dict[str, Any]]:
        """获取用户信息"""
        url = f"{self.base_url}/v4/statuses/user_timeline.json"
        params = {"user_id": user_id, "page": 1, "count": 10}
        
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(url, params=params, headers=self.headers)
                if resp.status_code == 200:
                    return resp.json()
            except Exception as e:
                print(f"获取用户信息失败: {e}")
        return None
    
    async def get_user_portfolios(self, user_id: str) -> Optional[List[Dict[str, Any]]]:
        """获取用户组合列表（需要登录）"""
        url = f"{self.base_url}/cubes/rebalancing/portfolio_list.json"
        params = {"user_id": user_id}
        
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(url, params=params, headers=self.headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("list", [])
            except Exception as e:
                print(f"获取组合列表失败: {e}")
        return None
    
    async def get_portfolio_detail(self, portfolio_id: str) -> Optional[Dict[str, Any]]:
        """获取组合详情"""
        url = f"{self.base_url}/cubes/ranking/overview.json"
        params = {"cube_symbol": portfolio_id}
        
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(url, params=params, headers=self.headers)
                if resp.status_code == 200:
                    return resp.json()
            except Exception as e:
                print(f"获取组合详情失败: {e}")
        return None
    
    async def get_user_stocks(self, user_id: str) -> Optional[List[Dict[str, Any]]]:
        """获取用户自选股（需要登录）"""
        url = f"{self.base_url}/stock/forbidden_stocks.json"
        params = {"user_id": user_id}
        
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(url, params=params, headers=self.headers)
                if resp.status_code == 200:
                    return resp.json()
            except Exception as e:
                print(f"获取自选股失败: {e}")
        return None
    
    async def get_latest_statuses(self, user_id: str, count: int = 10) -> Optional[List[Dict[str, Any]]]:
        """获取用户最新动态"""
        url = f"{self.base_url}/status/livenews/list.json"
        params = {"user_id": user_id, "page": 1, "count": count}
        
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(url, params=params, headers=self.headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("list", [])
            except Exception as e:
                print(f"获取动态失败: {e}")
        return None


# 使用示例
if __name__ == "__main__":
    import asyncio
    
    async def main():
        service = XueqiuService()
        
        # 方式1: 从环境变量读取
        # export XUEQIU_COOKIE="your_cookie_here"
        
        # 方式2: 从文件读取
        service.load_cookie_from_file()
        
        # 方式3: 手动设置
        # service.set_cookie("your_cookie_here")
        
        # 获取 metalslime (ID: 2292705444) 的数据
        user_id = "2292705444"
        
        # 获取用户动态
        statuses = await service.get_latest_statuses(user_id)
        print(f"动态数量: {len(statuses) if statuses else 0}")
        
        # 获取组合（需要登录后的cookie）
        portfolios = await service.get_user_portfolios(user_id)
        print(f"组合数量: {len(portfolios) if portfolios else 0}")
    
    asyncio.run(main())