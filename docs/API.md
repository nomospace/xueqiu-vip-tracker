# Snowball VIP Monitor API 文档

Base URL: `http://localhost:8000`

## 认证

所有API需要在Header中携带Token：
```
Authorization: Bearer <token>
```

---

## 大V管理

### 获取大V列表

```
GET /api/vip
```

**Query Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| skip | int | 否 | 跳过数量，默认0 |
| limit | int | 否 | 返回数量，默认20 |

**Response:**
```json
[
  {
    "id": 1,
    "xueqiu_id": "123456",
    "nickname": "投资大V",
    "avatar": "https://...",
    "followers": 10000,
    "description": "价值投资者"
  }
]
```

### 添加大V

```
POST /api/vip
```

**Request Body:**
```json
{
  "xueqiu_id": "123456"
}
```

**Response:**
```json
{
  "id": 1,
  "xueqiu_id": "123456",
  "nickname": "投资大V",
  "avatar": "https://...",
  "followers": 10000,
  "description": "价值投资者"
}
```

### 获取大V详情

```
GET /api/vip/{vip_id}
```

### 删除大V

```
DELETE /api/vip/{vip_id}
```

---

## 动态监听

### 获取动态列表

```
GET /api/posts
```

**Query Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| vip_id | int | 否 | 大V ID |
| post_type | string | 否 | 类型：post/repost/comment |
| skip | int | 否 | 跳过数量 |
| limit | int | 否 | 返回数量 |

**Response:**
```json
[
  {
    "id": 1,
    "vip_id": 1,
    "post_id": "123456789",
    "type": "post",
    "content": "今天市场表现...",
    "likes": 100,
    "comments": 20,
    "created_at": "2026-03-16T12:00:00Z"
  }
]
```

---

## 持仓监控

### 获取大V持仓

```
GET /api/holdings/{vip_id}
```

**Response:**
```json
[
  {
    "id": 1,
    "vip_id": 1,
    "stock_code": "600519",
    "stock_name": "贵州茅台",
    "position": 15.50,
    "updated_at": "2026-03-16T12:00:00Z"
  }
]
```

### 获取持仓变动历史

```
GET /api/holdings/changes
```

**Query Parameters:**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| vip_id | int | 否 | 大V ID |
| stock_code | string | 否 | 股票代码 |
| skip | int | 否 | 跳过数量 |
| limit | int | 否 | 返回数量 |

**Response:**
```json
[
  {
    "id": 1,
    "vip_id": 1,
    "stock_code": "600519",
    "stock_name": "贵州茅台",
    "change_type": "increase",
    "old_position": 10.00,
    "new_position": 15.50,
    "change_percent": 55.00,
    "detected_at": "2026-03-16T12:00:00Z"
  }
]
```

---

## WebSocket 实时推送

### 连接

```
ws://localhost:8000/ws
```

### 消息格式

**新动态推送:**
```json
{
  "type": "new_post",
  "data": {
    "vip_id": 1,
    "vip_name": "投资大V",
    "content": "...",
    "created_at": "2026-03-16T12:00:00Z"
  }
}
```

**持仓变动推送:**
```json
{
  "type": "holding_change",
  "data": {
    "vip_id": 1,
    "vip_name": "投资大V",
    "stock_code": "600519",
    "stock_name": "贵州茅台",
    "change_type": "increase",
    "change_percent": 55.00
  }
}
```

---

## 错误响应

所有API在出错时返回统一格式：

```json
{
  "detail": "错误描述"
}
```

常见HTTP状态码：
- 400: 请求参数错误
- 401: 未认证
- 403: 无权限
- 404: 资源不存在
- 500: 服务器内部错误