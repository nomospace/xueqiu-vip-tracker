"""
WebSocket 实时推送
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import json

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)


manager = ConnectionManager()


@router.websocket("")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket 连接"""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # 处理客户端消息
            try:
                message = json.loads(data)
                # Echo back or process
                await websocket.send_json({
                    "type": "pong",
                    "data": message
                })
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON"
                })
    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def broadcast_new_post(post_data: dict):
    """广播新动态"""
    await manager.broadcast({
        "type": "new_post",
        "data": post_data
    })


async def broadcast_holding_change(change_data: dict):
    """广播持仓变动"""
    await manager.broadcast({
        "type": "holding_change",
        "data": change_data
    })