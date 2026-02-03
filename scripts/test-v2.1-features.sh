#!/bin/bash

# Test Mission Control v2.1 Features

set -e

MC_URL="http://localhost:3006"
AGENT_NAME="johnny"

echo "🧪 Testing Mission Control v2.1 Features"
echo "=========================================="
echo ""

# Test 1: WORKING.md API
echo "📝 Test 1: WORKING.md API"
echo "-------------------------"

echo "✓ Testing GET /api/memory/working"
WORKING_GET=$(curl -s "${MC_URL}/api/memory/working?agent=${AGENT_NAME}")
if echo "$WORKING_GET" | grep -q "content"; then
  echo "  ✅ GET endpoint working"
else
  echo "  ❌ GET endpoint failed"
  echo "  Response: $WORKING_GET"
fi

echo "✓ Testing POST /api/memory/working"
WORKING_POST=$(curl -s -X POST "${MC_URL}/api/memory/working" \
  -H "Content-Type: application/json" \
  -d "{\"agent\": \"${AGENT_NAME}\"}")
if echo "$WORKING_POST" | grep -q "success"; then
  echo "  ✅ POST endpoint working"
else
  echo "  ❌ POST endpoint failed"
  echo "  Response: $WORKING_POST"
fi

echo "✓ Testing DELETE /api/memory/working"
WORKING_DELETE=$(curl -s -X DELETE "${MC_URL}/api/memory/working?agent=${AGENT_NAME}")
if echo "$WORKING_DELETE" | grep -q "success"; then
  echo "  ✅ DELETE endpoint working"
else
  echo "  ❌ DELETE endpoint failed"
  echo "  Response: $WORKING_DELETE"
fi

echo ""

# Test 2: Daily Memory Notes
echo "📅 Test 2: Daily Memory Notes API"
echo "----------------------------------"

DAILY_DATE=$(date +%Y-%m-%d)
echo "✓ Testing POST /api/memory/daily for $DAILY_DATE"
DAILY_POST=$(curl -s -X POST "${MC_URL}/api/memory/daily" \
  -H "Content-Type: application/json" \
  -d "{\"agent\": \"${AGENT_NAME}\", \"date\": \"${DAILY_DATE}\"}")
if echo "$DAILY_POST" | grep -q "success"; then
  echo "  ✅ Daily notes endpoint working"
  echo "  Stats: $(echo "$DAILY_POST" | jq -r '.stats // empty')"
else
  echo "  ❌ Daily notes endpoint failed"
  echo "  Response: $DAILY_POST"
fi

echo ""

# Test 3: Standup API
echo "📊 Test 3: Standup API"
echo "----------------------"

echo "✓ Testing POST /api/standup"
STANDUP=$(curl -s -X POST "${MC_URL}/api/standup" \
  -H "Content-Type: application/json" \
  -d '{"hours": 24, "sendToTelegram": false}')
if echo "$STANDUP" | grep -q "success"; then
  echo "  ✅ Standup endpoint working"
  echo "  Stats: $(echo "$STANDUP" | jq -r '.stats // empty')"
  echo ""
  echo "  Preview:"
  echo "$STANDUP" | jq -r '.standup // empty' | head -20
else
  echo "  ❌ Standup endpoint failed"
  echo "  Response: $STANDUP"
fi

echo ""

# Test 4: Check Build
echo "🏗️  Test 4: Build Check"
echo "-----------------------"

cd /home/seed/clawd/mission-control-v2
if npm run build > /dev/null 2>&1; then
  echo "  ✅ Build successful"
else
  echo "  ❌ Build failed"
  echo "  Run: cd /home/seed/clawd/mission-control-v2 && npm run build"
fi

echo ""

# Summary
echo "=========================================="
echo "✅ All core features tested"
echo ""
echo "Next steps:"
echo "1. Apply SQL migration: sql/003_agent_levels.sql"
echo "2. Setup cron: ./scripts/setup-daily-standup-cron.sh"
echo "3. Restart Mission Control"
echo "4. Test UI features (blocked column, level badges)"
echo ""
echo "Documentation: IMPLEMENTATION_V2.1.md"
