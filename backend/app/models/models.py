"""
数据库模型
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Decimal, ForeignKey, Enum
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import enum

Base = declarative_base()


class PostType(enum.Enum):
    post = "post"
    repost = "repost"
    comment = "comment"


class ChangeType(enum.Enum):
    add = "add"
    remove = "remove"
    increase = "increase"
    decrease = "decrease"


class VIPUser(Base):
    """大V表"""
    __tablename__ = "vip_users"

    id = Column(Integer, primary_key=True, index=True)
    xueqiu_id = Column(String(50), unique=True, nullable=False, index=True)
    nickname = Column(String(100), nullable=False)
    avatar = Column(String(500))
    followers = Column(Integer, default=0)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关系
    posts = relationship("VIPPost", back_populates="vip")
    holdings = relationship("VIPHolding", back_populates="vip")
    changes = relationship("HoldingChange", back_populates="vip")


class VIPPost(Base):
    """动态表"""
    __tablename__ = "vip_posts"

    id = Column(Integer, primary_key=True, index=True)
    vip_id = Column(Integer, ForeignKey("vip_users.id"), nullable=False, index=True)
    post_id = Column(String(50), unique=True, nullable=False)
    type = Column(Enum(PostType), default=PostType.post)
    content = Column(Text)
    images = Column(Text)  # JSON 字符串
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True))  # 发布时间
    crawled_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    vip = relationship("VIPUser", back_populates="posts")


class VIPHolding(Base):
    """持仓表"""
    __tablename__ = "vip_holdings"

    id = Column(Integer, primary_key=True, index=True)
    vip_id = Column(Integer, ForeignKey("vip_users.id"), nullable=False, index=True)
    stock_code = Column(String(20), nullable=False, index=True)
    stock_name = Column(String(50), nullable=False)
    position = Column(Decimal(5, 2), default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    vip = relationship("VIPUser", back_populates="holdings")


class HoldingChange(Base):
    """持仓变动表"""
    __tablename__ = "holding_changes"

    id = Column(Integer, primary_key=True, index=True)
    vip_id = Column(Integer, ForeignKey("vip_users.id"), nullable=False, index=True)
    stock_code = Column(String(20), nullable=False, index=True)
    stock_name = Column(String(50))
    change_type = Column(Enum(ChangeType), nullable=False)
    old_position = Column(Decimal(5, 2))
    new_position = Column(Decimal(5, 2))
    change_percent = Column(Decimal(5, 2))
    detected_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    vip = relationship("VIPUser", back_populates="changes")