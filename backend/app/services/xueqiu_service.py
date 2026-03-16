"""
脱水雪球 - 数据服务（手动模式）

由于服务器 Python 3.6 不支持 Playwright，改为手动输入模式
后续可升级 Python 后启用自动爬取
"""

import os
from typing import Optional, List, Dict, Any
from datetime import datetime
from dataclasses import dataclass, field, asdict

# 雪球 API
XUEQIU_BASE = "https://xueqiu.com"

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
    """雪球数据服务（手动模式）"""
    
    def __init__(self):
        self.cookie_file = os.path.expanduser("~/.xueqiu_cookie")
        self.cookie = ""
        self._load_cookie()
    
    def _load_cookie(self) -> str:
        """加载 Cookie"""
        if os.path.exists(self.cookie_file):
            try:
                with open(self.cookie_file, "r", encoding="utf-8") as f:
                    self.cookie = f.read().strip()
            except Exception as e:
                print(f"加载 Cookie 失败: {e}")
                self.cookie = ""
        return self.cookie
    
    def has_cookie(self) -> bool:
        """检查是否已配置 Cookie"""
        return bool(self.cookie)
    
    def get_user_info(self, user_id: str) -> Optional[UserInfo]:
        """获取用户信息（手动模式）"""
        # 返回默认用户信息，用户需要手动补充
        return UserInfo(
            user_id=str(user_id),
            screen_name=f"用户{user_id}",
            crawled_at=datetime.now().isoformat(),
        )
    
    def get_user_statuses(
        self,
        user_id: str,
        status_type: int = 0,
        count: int = 20
    ) -> List[Status]:
        """获取用户动态（手动模式）"""
        # 返回空列表，暂不支持自动爬取
        return []
    
    def get_user_portfolios(self, user_id: str) -> List[Portfolio]:
        """获取用户组合列表（手动模式）"""
        return []
    
    def get_portfolio_rebalancing(
        self,
        cube_id: str,
        count: int = 10
    ) -> List[Rebalancing]:
        """获取组合调仓历史（手动模式）"""
        return []
    
    def crawl_vip(self, user_id: str) -> Dict[str, Any]:
        """爬取大V完整信息（手动模式）"""
        result = {
            "user_id": user_id,
            "success": False,
            "user_info": None,
            "statuses": [],
            "trade_statuses": [],
            "rebalancings": [],
            "error": "自动爬取暂不可用，请手动输入信息"
        }
        
        # 返回默认信息，提示用户手动输入
        result["user_info"] = asdict(UserInfo(
            user_id=str(user_id),
            screen_name=f"用户{user_id}",
            crawled_at=datetime.now().isoformat(),
        ))
        
        return result


def crawl_vip(user_id: str) -> Dict[str, Any]:
    """爬取大V信息（便捷函数）"""
    service = XueqiuService()
    return service.crawl_vip(user_id)


if __name__ == "__main__":
    import sys
    import json
    user_id = sys.argv[1] if len(sys.argv) > 1 else "1247347543"
    
    print(f"获取用户 {user_id} 信息...")
    result = crawl_vip(user_id)
    print(json.dumps(result, ensure_ascii=False, indent=2))