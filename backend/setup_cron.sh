#!/bin/bash
# 设置定时抓取任务

SCRIPT_DIR="/home/admin/.openclaw/workspace/snowball-vip-monitor/backend"
PYTHON="$SCRIPT_DIR/venv/bin/python3"
LOG_FILE="/tmp/snowball-crawl.log"

# 添加 cron 任务（每30分钟执行一次）
(crontab -l 2>/dev/null | grep -v "crawl_and_analyze.py"; echo "*/30 * * * * cd $SCRIPT_DIR && DASHSCOPE_API_KEY=\$DASHSCOPE_API_KEY DEEPSEEK_API_KEY=\$DEEPSEEK_API_KEY $PYTHON $SCRIPT_DIR/crawl_and_analyze.py >> $LOG_FILE 2>&1") | crontab -

echo "✅ 定时任务已添加"
echo "   频率: 每30分钟"
echo "   日志: $LOG_FILE"
echo ""
echo "查看任务: crontab -l"
echo "查看日志: tail -f $LOG_FILE"
