#!/bin/bash
# 雪球大V追踪器 - 一键部署脚本
# 使用: ./scripts/deploy.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 项目根目录
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_NAME="xueqiu-vip-tracker"
NGINX_PORT=3007
BACKEND_PORT=8000

echo -e "${GREEN}=== 雪球大V追踪器 一键部署 ===${NC}"
echo ""

# 检查命令
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}错误: 未找到 $1 命令${NC}"
        exit 1
    fi
}

# 安装后端依赖
setup_backend() {
    echo -e "${YELLOW}[1/4] 配置后端...${NC}"
    cd "$PROJECT_DIR/backend"
    
    # 创建虚拟环境
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    
    # 安装依赖
    source venv/bin/activate
    pip install -q -r requirements.txt
    deactivate
    
    echo -e "${GREEN}后端依赖安装完成${NC}"
}

# 构建前端
build_frontend() {
    echo -e "${YELLOW}[2/4] 构建前端...${NC}"
    cd "$PROJECT_DIR/frontend"
    
    # 安装依赖
    if [ ! -d "node_modules" ]; then
        npm install --silent
    fi
    
    # 构建
    npm run build -- --configuration production 2>/dev/null || npx ng build --configuration production
    
    echo -e "${GREEN}前端构建完成${NC}"
}

# 配置 Nginx
setup_nginx() {
    echo -e "${YELLOW}[3/4] 配置 Nginx...${NC}"
    
    # 修复目录权限（让 nginx 用户可以访问）
    chmod 755 /home/${USER} 2>/dev/null || true
    chmod 755 ${PROJECT_DIR} 2>/dev/null || true
    chmod -R 755 ${PROJECT_DIR}/frontend/dist 2>/dev/null || true
    
    # 创建 Nginx 配置
    sudo tee /etc/nginx/conf.d/${PROJECT_NAME}.conf > /dev/null << EOF
server {
    listen ${NGINX_PORT};
    server_name localhost;
    
    # 前端静态文件
    location / {
        root ${PROJECT_DIR}/frontend/dist/snowball-vip/browser;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
    
    # API 代理
    location /api {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # WebSocket 支持
    location /ws {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
    
    # 测试并重载 Nginx
    sudo nginx -t && sudo nginx -s reload
    
    echo -e "${GREEN}Nginx 配置完成，端口: ${NGINX_PORT}${NC}"
}

# 创建 systemd 服务
create_service() {
    echo -e "${YELLOW}[4/4] 创建系统服务...${NC}"
    
    sudo tee /etc/systemd/system/${PROJECT_NAME}.service > /dev/null << EOF
[Unit]
Description=Xueqiu VIP Tracker Backend
After=network.target

[Service]
Type=simple
User=${USER}
WorkingDirectory=${PROJECT_DIR}/backend
Environment="PATH=${PROJECT_DIR}/backend/venv/bin"
ExecStart=${PROJECT_DIR}/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port ${BACKEND_PORT}
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable ${PROJECT_NAME}
    sudo systemctl restart ${PROJECT_NAME}
    
    echo -e "${GREEN}系统服务创建完成${NC}"
}

# 主流程
main() {
    check_command python3
    check_command npm
    check_command nginx
    
    setup_backend
    build_frontend
    setup_nginx
    create_service
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}部署完成！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "访问地址: ${YELLOW}http://localhost:${NGINX_PORT}${NC}"
    echo ""
    echo -e "管理命令:"
    echo -e "  查看状态: ${YELLOW}sudo systemctl status ${PROJECT_NAME}${NC}"
    echo -e "  重启服务: ${YELLOW}sudo systemctl restart ${PROJECT_NAME}${NC}"
    echo -e "  查看日志: ${YELLOW}sudo journalctl -u ${PROJECT_NAME} -f${NC}"
    echo ""
}

main "$@"