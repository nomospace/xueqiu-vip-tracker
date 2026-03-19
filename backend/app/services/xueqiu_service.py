"""
脱水雪球 - 数据服务（移动端 API）

使用移动端 API 绕过雪球 WAF
"""

import os
import json
import time
import random
from typing import Optional, List, Dict, Any
from datetime import datetime
from dataclasses import dataclass, field, asdict
import requests

# 雪球移动端 API
XUEQIU_API = "https://api.xueqiu.com"

# 动态类型
STATUS_TYPES = {
    10: "全部",
    0: "原发布",
    2: "长文",
    4: "问答",
    9: "热门",
    11: "交易",
}


@dataclass
class UserInfo:
    """用户信息"""
    user_id: str
    screen_name: str = ""
    avatar: str = ""
    followers_count: int = 0
    friends_count: int = 0
    description: str = ""
    verified: bool = False
    status_count: int = 0
    crawled_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class Status:
    """动态"""
    id: str
    user_id: str
    text: str = ""
    title: str = ""
    link: str = ""
    created_at: str = ""
    retweet_count: int = 0
    reply_count: int = 0
    like_count: int = 0


@dataclass
class Portfolio:
    """组合"""
    cube_id: str
    name: str = ""
    symbol: str = ""
    net_value: float = 0.0
    total_gain: float = 0.0


@dataclass
class Rebalancing:
    """调仓记录"""
    cube_id: str
    title: str = ""
    link: str = ""
    description: str = ""
    pub_date: str = ""


class XueqiuService:
    """雪球数据服务（移动端 API）"""
    
    def __init__(self):
        self.cookie_file = os.path.expanduser("~/.xueqiu_cookie")
        self.cookie = ""
        self.cookies = {}
        self.session = None
        self._load_cookie()
        self._init_session()
    
    def _load_cookie(self) -> str:
        """加载 Cookie"""
        if os.path.exists(self.cookie_file):
            try:
                with open(self.cookie_file, "r", encoding="utf-8") as f:
                    self.cookie = f.read().strip()
                
                # 清理无效字符
                self.cookie = self.cookie.replace('…', '').replace('\\u2026', '')
                
                # 解析 Cookie
                for item in self.cookie.split(';'):
                    item = item.strip()
                    if '=' in item:
                        k, v = item.split('=', 1)
                        # 清理值中的无效字符
                        v_clean = v.replace('…', '').strip()
                        self.cookies[k.strip()] = v_clean
            except Exception as e:
                print(f"加载 Cookie 失败: {e}")
        return self.cookie
    
    def _init_session(self):
        """初始化请求会话"""
        self.session = requests.Session()
        
        # 移动端 UA（关键！）
        headers = {
            'User-Agent': 'Xueqiu iPhone 14.17',
            'Accept': 'application/json',
            'Accept-Language': 'zh-Hans;q=1',
            'X-Requested-With': 'com.xueqiu.android',
        }
        
        self.session.headers.update(headers)
        self.session.cookies.update(self.cookies)
    
    def has_cookie(self) -> bool:
        """检查是否已配置 Cookie"""
        return bool(self.cookies.get('xq_a_token'))
    
    def get_current_user_id(self) -> Optional[str]:
        """获取当前登录用户 ID"""
        return self.cookies.get('u')
    
    def _random_delay(self, min_sec: float = 0.5, max_sec: float = 2.0):
        """随机延迟，避免被 WAF 拦截"""
        time.sleep(random.uniform(min_sec, max_sec))
    
    def get_user_info(self, user_id: str) -> Optional[UserInfo]:
        """获取用户信息"""
        try:
            # 移动端用户信息 API
            url = f"{XUEQIU_API}/v4/user/show.json?user_id={user_id}"
            
            resp = self.session.get(url, timeout=15)
            
            if resp.status_code == 200 and 'json' in resp.headers.get('Content-Type', ''):
                data = resp.json()
                return UserInfo(
                    user_id=str(data.get('id', user_id)),
                    screen_name=data.get('screen_name', ''),
                    avatar=data.get('profile_image_url', ''),
                    followers_count=data.get('followers_count', 0),
                    friends_count=data.get('friends_count', 0),
                    description=data.get('description', ''),
                    verified=data.get('verified', False),
                    status_count=data.get('status_count', 0),
                )
            
            # 返回默认用户信息
            return UserInfo(user_id=str(user_id), screen_name=f"用户{user_id}")
            
        except Exception as e:
            print(f"获取用户信息失败: {e}")
            return UserInfo(user_id=str(user_id), screen_name=f"用户{user_id}")
    
    def get_user_statuses(
        self,
        user_id: str,
        status_type: int = 0,
        count: int = 20
    ) -> List[Status]:
        """获取用户动态"""
        self._random_delay()
        
        try:
            # 移动端动态 API
            url = f"{XUEQIU_API}/v4/statuses/user_timeline.json"
            params = {
                'user_id': user_id,
                'page': 1,
                'type': status_type,
                'count': count,
            }
            
            resp = self.session.get(url, params=params, timeout=15)
            
            if resp.status_code == 200 and 'json' in resp.headers.get('Content-Type', ''):
                data = resp.json()
                statuses = []
                
                for s in data.get('statuses', []):
                    # 获取用户昵称
                    user = s.get('user', {})
                    screen_name = user.get('screen_name', '')
                    
                    status = Status(
                        id=str(s.get('id', '')),
                        user_id=str(s.get('user_id', '')),
                        text=s.get('text', ''),
                        title=s.get('title', ''),
                        link=f"https://xueqiu.com/{s.get('user_id', '')}/{s.get('id', '')}",
                        created_at=datetime.fromtimestamp(
                            s.get('created_at', 0) / 1000
                        ).isoformat() if s.get('created_at') else '',
                        retweet_count=s.get('retweet_count', 0),
                        reply_count=s.get('reply_count', 0),
                        like_count=s.get('like_count', 0),
                    )
                    statuses.append(status)
                
                return statuses
            
            return []
            
        except Exception as e:
            print(f"获取用户动态失败: {e}")
            return []
    
    def get_user_portfolios(self, user_id: str) -> List[Portfolio]:
        """获取用户组合列表"""
        self._random_delay()
        
        try:
            # 从交易动态中提取组合信息
            url = f"{XUEQIU_API}/v4/statuses/user_timeline.json"
            params = {
                'user_id': user_id,
                'page': 1,
                'type': 11,  # 交易类型
                'count': 20,
            }
            
            resp = self.session.get(url, params=params, timeout=15)
            
            if resp.status_code == 200 and 'json' in resp.headers.get('Content-Type', ''):
                data = resp.json()
                portfolios = []
                seen = set()
                
                for s in data.get('statuses', []):
                    cube = s.get('cube', {})
                    cube_id = cube.get('id', '')
                    
                    if cube_id and cube_id not in seen:
                        seen.add(cube_id)
                        portfolio = Portfolio(
                            cube_id=str(cube_id),
                            name=cube.get('name', ''),
                            symbol=cube.get('symbol', ''),
                            net_value=float(cube.get('net_value', 0)),
                            total_gain=float(cube.get('total_gain', 0)),
                        )
                        portfolios.append(portfolio)
                
                return portfolios
            
            return []
            
        except Exception as e:
            print(f"获取用户组合失败: {e}")
            return []
    
    def get_user_comments(
        self,
        user_id: str,
        count: int = 20
    ) -> List[Status]:
        """获取用户评论/回复"""
        self._random_delay()
        
        try:
            # 评论类型通常是 type=4 或者使用专门的评论API
            url = f"{XUEQIU_API}/v4/statuses/user_timeline.json"
            params = {
                'user_id': user_id,
                'page': 1,
                'type': 4,  # 问答/评论类型
                'count': count,
            }
            
            resp = self.session.get(url, params=params, timeout=15)
            
            if resp.status_code == 200 and 'json' in resp.headers.get('Content-Type', ''):
                data = resp.json()
                comments = []
                
                for s in data.get('statuses', []):
                    comment = Status(
                        id=str(s.get('id', '')),
                        user_id=str(s.get('user_id', '')),
                        text=s.get('text', ''),
                        title=s.get('title', ''),
                        link=f"https://xueqiu.com/{s.get('user_id', '')}/{s.get('id', '')}",
                        created_at=datetime.fromtimestamp(
                            s.get('created_at', 0) / 1000
                        ).isoformat() if s.get('created_at') else '',
                        retweet_count=s.get('retweet_count', 0),
                        reply_count=s.get('reply_count', 0),
                        like_count=s.get('like_count', 0),
                    )
                    comments.append(comment)
                
                return comments
            
            return []
            
        except Exception as e:
            print(f"获取用户评论失败: {e}")
            return []
    
    def get_portfolio_rebalancing(
        self,
        cube_id: str,
        count: int = 10
    ) -> List[Rebalancing]:
        """获取组合调仓历史"""
        self._random_delay()
        
        try:
            url = f"{XUEQIU_API}/cubes/rebalancing/history.json"
            params = {
                'cube_symbol': cube_id,
                'count': count,
                'page': 1,
            }
            
            resp = self.session.get(url, params=params, timeout=15)
            
            if resp.status_code == 200 and 'json' in resp.headers.get('Content-Type', ''):
                data = resp.json()
                rebalancings = []
                
                for item in data.get('items', []):
                    rebalancing = Rebalancing(
                        cube_id=cube_id,
                        title=item.get('title', ''),
                        link=f"https://xueqiu.com/cubes/rebalancing/{cube_id}/{item.get('id', '')}",
                        description=item.get('description', ''),
                        pub_date=datetime.fromtimestamp(
                            item.get('created_at', 0) / 1000
                        ).isoformat() if item.get('created_at') else '',
                    )
                    rebalancings.append(rebalancing)
                
                return rebalancings
            
            return []
            
        except Exception as e:
            print(f"获取调仓历史失败: {e}")
            return []
    
    def get_user_watchlist(self, user_id: str) -> List[Dict[str, Any]]:
        """
        获取用户自选股列表
        
        Args:
            user_id: 雪球用户 ID
            
        Returns:
            自选股列表，包含股票代码、名称、市场等信息
        """
        self._random_delay()
        
        try:
            # 雪球自选股 API
            url = f"{XUEQIU_API}/v4/user/{user_id}/stocks.json"
            
            print(f"[XueqiuService] 获取用户 {user_id} 的自选股...")
            
            resp = self.session.get(url, timeout=15)
            
            print(f"[XueqiuService] 响应状态: {resp.status_code}, Content-Type: {resp.headers.get('Content-Type', '')}")
            
            if resp.status_code == 403:
                print(f"[XueqiuService] 403 Forbidden - 自选股是私有数据，需要用户自己的 Cookie")
                return []
            
            if resp.status_code == 200 and 'json' in resp.headers.get('Content-Type', ''):
                data = resp.json()
                stocks = []
                
                # 解析返回的股票列表
                items = data.get('items', []) or data.get('stocks', []) or data.get('list', [])
                
                print(f"[XueqiuService] 获取到 {len(items)} 条记录")
                
                for item in items:
                    stock_code = item.get('code', '') or item.get('stock_code', '') or item.get('symbol', '')
                    stock_name = item.get('name', '') or item.get('stock_name', '') or item.get('screen_name', '')
                    market = item.get('market', '') or item.get('exchange', '')
                    
                    # 判断是否是沪深股票
                    is_cn = False
                    if stock_code:
                        # 根据代码前缀判断
                        code_num = stock_code.replace('SH', '').replace('SZ', '').replace('HK', '')
                        if stock_code.startswith('SH') or stock_code.startswith('SZ'):
                            is_cn = True
                            market = market or stock_code[:2]
                        elif stock_code.startswith('0') or stock_code.startswith('3') or stock_code.startswith('6'):
                            is_cn = True
                            # 判断具体市场
                            if stock_code.startswith('6'):
                                market = 'SH'
                            else:
                                market = 'SZ'
                        elif stock_code.startswith('HK'):
                            market = 'HK'
                            is_cn = False
                    
                    if stock_code and stock_name:
                        stocks.append({
                            'stock_code': stock_code,
                            'stock_name': stock_name,
                            'market': market,
                            'is_cn': is_cn,
                        })
                
                return stocks
            
            return []
            
        except Exception as e:
            print(f"[XueqiuService] 获取用户自选股失败: {e}")
            return []
    
    def crawl_vip(self, user_id: str) -> Dict[str, Any]:
        """爬取大V完整信息"""
        result = {
            "user_id": user_id,
            "success": False,
            "user_info": None,
            "statuses": [],
            "trade_statuses": [],
            "rebalancings": [],
            "error": None
        }
        
        try:
            # 获取用户信息
            user_info = self.get_user_info(user_id)
            result["user_info"] = asdict(user_info)
            
            # 获取原发布动态
            statuses = self.get_user_statuses(user_id, 0, 10)
            result["statuses"] = [asdict(s) for s in statuses]
            
            # 获取交易动态
            trade_statuses = self.get_user_statuses(user_id, 11, 10)
            result["trade_statuses"] = [asdict(s) for s in trade_statuses]
            
            # 获取组合
            portfolios = self.get_user_portfolios(user_id)
            
            # 获取每个组合的调仓历史
            for p in portfolios[:3]:  # 只取前3个组合
                rebalancings = self.get_portfolio_rebalancing(p.symbol, 5)
                for r in rebalancings:
                    result["rebalancings"].append(asdict(r))
            
            result["success"] = True
            
        except Exception as e:
            result["error"] = str(e)
        
        return result


def crawl_vip(user_id: str) -> Dict[str, Any]:
    """爬取大V信息（便捷函数）"""
    service = XueqiuService()
    return service.crawl_vip(user_id)


if __name__ == "__main__":
    import sys
    user_id = sys.argv[1] if len(sys.argv) > 1 else "4480406461"
    
    print(f"获取用户 {user_id} 信息...")
    result = crawl_vip(user_id)
    print(json.dumps(result, ensure_ascii=False, indent=2))