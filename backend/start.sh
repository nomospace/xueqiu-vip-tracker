#!/bin/bash
# 脱水雪球后端启动脚本

cd /home/admin/.openclaw/workspace/snowball-vip-monitor/backend
source venv/bin/activate

# 启动服务
uvicorn app.main:app --host 0.0.0.0 --port 8000
