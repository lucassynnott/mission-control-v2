#!/bin/bash

# Setup Daily Standup Cron Job
# Fires at 23:30 GMT+2 (21:30 UTC) daily
# Uses kimi-coding/k2p5 for cost efficiency

CRON_NAME="mission-control-daily-standup"
AGENT_ID="johnny"
# 23:30 GMT+2 = 21:30 UTC
CRON_EXPR="30 21 * * *"

echo "🚀 Setting up Daily Standup Cron Job..."
echo "  Name: $CRON_NAME"
echo "  Schedule: $CRON_EXPR (21:30 UTC / 23:30 GMT+2)"
echo "  Agent: $AGENT_ID"
echo "  Model: kimi-coding/k2p5"

# Create the cron job using OpenClaw CLI
openclaw cron create \
  --agent "$AGENT_ID" \
  --name "$CRON_NAME" \
  --cron "$CRON_EXPR" \
  --model "kimi-coding/k2p5" \
  --isolated \
  --message "Generate daily standup report and send to Lucas via Telegram.

Instructions:
1. Call POST http://localhost:3006/api/standup with body: {\"hours\": 24, \"sendToTelegram\": true}
2. The API will:
   - Query all completed tasks in last 24h
   - Query in-progress tasks
   - Query blocked tasks  
   - Query tasks needing review
   - Format a markdown standup summary
   - Send to Lucas via Telegram
3. Report the result

Use the Mission Control service credentials from mission-control.env if needed.
"

echo ""
echo "✅ Cron job created successfully!"
echo ""
echo "To verify:"
echo "  openclaw cron list"
echo ""
echo "To test manually:"
echo "  curl -X POST http://localhost:3006/api/standup -H 'Content-Type: application/json' -d '{\"hours\": 24, \"sendToTelegram\": true}'"
