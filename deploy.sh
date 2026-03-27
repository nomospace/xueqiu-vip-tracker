#!/bin/bash
# 脱水雪球 一键部署脚本

set -e

PROJECT_DIR="/home/admin/.openclaw/workspace/snowball-vip-monitor"
BUILD_TIME=$(date '+%Y-%m-%d %H:%M')

echo "======================================"
echo "🚀 脱水雪球 一键部署"
echo "======================================"

# 更新构建时间戳
echo "📝 更新构建时间戳: $BUILD_TIME"
sed -i "s/buildTime = '.*'/buildTime = '$BUILD_TIME'/" $PROJECT_DIR/frontend/src/app/pages/dashboard/dashboard.component.ts

# 编译前端
echo ""
echo "📦 编译前端..."
cd $PROJECT_DIR/frontend
npm run build -- --configuration production

# 重启后端
echo ""
echo "🔄 重启后端服务..."
pkill -f "uvicorn app.main:app --host 0.0.0.0 --port 8000" 2>/dev/null || true
sleep 1
cd $PROJECT_DIR/backend
source venv/bin/activate
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/snowball-backend.log 2>&1 &
sleep 3

# 重新加载 Nginx
echo ""
echo "🌐 重新加载 Nginx..."
sudo nginx -s reload

# 检查服务状态
echo ""
echo "✅ 检查服务状态..."
sleep 2

# 测试后端 API
if curl -s http://localhost:8000/health | grep -q "healthy"; then
    echo "   ✓ 后端服务正常"
else
    echo "   ✗ 后端服务异常"
fi

# 测试前端
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3007/ | grep -q "200"; then
    echo "   ✓ 前端服务正常"
else
    echo "   ✗ 前端服务异常"
fi

echo ""
echo "======================================"
echo "✅ 部署完成！"
echo "======================================"
echo ""
echo "访问地址: http://47.102.199.24:3007/"
echo "构建时间: $BUILD_TIME"
echo ""