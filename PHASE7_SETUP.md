# Phase 7: Notification System Integration - Setup Guide

## ✅ Completed Tasks

1. **Mention Parser Integration**
   - ✅ Integrated `mention-parser.ts` into activity feed
   - ✅ Updated `activity-feed.tsx` to use `highlightMentions()` for display
   - ✅ Added mention parsing to task creation and comments

2. **Comment System**
   - ✅ Added comment section to task detail view in `kanban-board.tsx`
   - ✅ Comments support @mentions with live highlighting
   - ✅ Mentions in comments create notifications automatically
   - ✅ Created `task_comments` database table (see `sql/002_task_comments.sql`)

3. **Activities API**
   - ✅ Created `/api/activities/route.ts` endpoint
   - ✅ Integrated with SSE for real-time broadcasts
   - ✅ Activities emit when tasks are created/moved
   - ✅ Mentions in activities trigger notifications

4. **Notification Daemon**
   - ✅ Created `scripts/notification-daemon.ts`
   - ✅ Polls `/api/notifications/deliver` every 2 seconds
   - ✅ Logs delivery results to console
   - ✅ Auto-restarts on failure via PM2

5. **PM2 Configuration**
   - ✅ Updated `ecosystem.config.js` with notification daemon
   - ✅ Configured logging for both app and daemon

## 🚀 Setup Instructions

### 1. Apply Database Migration

First, create the `task_comments` table in your Supabase database:

**Option A: Using Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `sql/002_task_comments.sql`
3. Run the SQL

**Option B: Using psql CLI**
```bash
export SUPABASE_DB_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_PROJECT.supabase.co:5432/postgres"
./scripts/apply-migrations.sh
```

### 2. Configure Environment Variables

Make sure your `.env.local` has these set:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenClaw (for notification delivery)
OPENCLAW_API_URL=http://localhost:8765
OPENCLAW_API_KEY=your-openclaw-api-key

# App URL (for notification daemon)
NEXT_PUBLIC_API_URL=http://localhost:3006
```

### 3. Build the Application

```bash
npm run build
```

### 4. Start Services with PM2

**Option A: Start all services**
```bash
pm2 start ecosystem.config.js
```

**Option B: Start individually**
```bash
# Main app
pm2 start ecosystem.config.js --only mission-control-v2

# Notification daemon
pm2 start ecosystem.config.js --only notification-daemon
```

### 5. Verify Everything is Running

```bash
# Check PM2 status
pm2 status

# Watch logs
pm2 logs

# Watch notification daemon specifically
pm2 logs notification-daemon

# Watch main app
pm2 logs mission-control-v2
```

### 6. Test Notification System

1. Open Mission Control: http://localhost:3006
2. Create a new task with description: "Hey @Johnny check this out"
3. Open task detail and add a comment: "@Claws what do you think?"
4. Check notification daemon logs - should show delivery attempts
5. Check activity feed - should show activities with highlighted mentions

## 📁 Files Modified/Created

### Created
- `scripts/notification-daemon.ts` - Polling daemon for notifications
- `sql/002_task_comments.sql` - Database migration for comments
- `app/api/activities/route.ts` - Activities API endpoint
- `scripts/apply-migrations.sh` - Migration helper script
- `PHASE7_SETUP.md` - This file

### Modified
- `components/activity-feed.tsx` - Uses `highlightMentions()` from mention-parser
- `components/kanban-board.tsx` - Added comment system with mention support
- `app/api/sse/route.ts` - Integrated with activities system
- `ecosystem.config.js` - Added notification daemon process
- `package.json` - Added ts-node dependency

## 🔍 How It Works

### Activity Flow
1. User creates task or adds comment
2. `parseMentions()` extracts @mentions
3. Creates notification records in database
4. Activity broadcasted via SSE to all connected clients
5. Activity feed updates in real-time

### Notification Delivery Flow
1. Notification daemon polls every 2 seconds
2. Queries undelivered notifications from database
3. Formats notification message
4. Sends to agent via OpenClaw `sessions_send` API
5. Marks notification as delivered
6. Logs results

### Comment System
1. Task detail dialog shows comment section
2. Users can @mention other agents
3. Comments displayed with highlighted mentions
4. New comments trigger notifications
5. Real-time updates via Supabase subscriptions

## 🎯 Testing Checklist

- [ ] Task creation with @mentions creates notifications
- [ ] Activity feed shows activities in real-time
- [ ] @mentions highlighted in cyan in activity feed
- [ ] Task detail dialog shows comment section
- [ ] Adding comment with @mention creates notification
- [ ] Comments display with highlighted mentions
- [ ] Notification daemon polling every 2 seconds
- [ ] Daemon logs show delivery attempts
- [ ] PM2 auto-restarts daemon on failure
- [ ] Both services run simultaneously via PM2

## 🐛 Troubleshooting

### Daemon not starting
```bash
# Check logs
pm2 logs notification-daemon --lines 50

# Restart manually
pm2 restart notification-daemon

# Check if ts-node is installed
npm list ts-node
```

### Mentions not creating notifications
- Verify agents exist in database with matching names
- Check browser console for API errors
- Verify `mention-parser.ts` import paths

### SSE not connecting
- Check browser console for connection errors
- Verify `/api/sse` endpoint is accessible
- Check CORS settings if using different domains

## 📊 Monitoring

```bash
# PM2 dashboard
pm2 monit

# View all logs
pm2 logs

# View specific service
pm2 logs notification-daemon
pm2 logs mission-control-v2

# Check process info
pm2 info notification-daemon
```

## ✨ Phase 7 Complete!

All notification system integration tasks completed successfully. The system now:
- Parses @mentions in tasks and comments
- Creates notifications automatically
- Highlights mentions in UI
- Delivers notifications via polling daemon
- Runs as production-ready PM2 services

Next steps:
- Monitor notification delivery success rate
- Add notification preferences per agent
- Implement notification batching/digests
- Add webhook support for external integrations
