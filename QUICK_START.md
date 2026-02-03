# Quick Start: Thread Subscriptions & Auto-Notify

## 🚀 Deploy in 5 Minutes

### Step 1: Run Database Migration
```bash
# Option A: Via Supabase Dashboard
# 1. Open https://supabase.com/dashboard
# 2. Go to SQL Editor
# 3. Paste contents of scripts/phase1-10-migration.sql
# 4. Click "Run"

# Option B: Via psql
psql $DATABASE_URL -f scripts/phase1-10-migration.sql
```

### Step 2: Restart Services
```bash
cd /home/seed/clawd/mission-control-v2

# Restart Next.js
pm2 restart mission-control-v2

# Restart notification daemon
pm2 restart notification-daemon

# Verify both running
pm2 list
```

### Step 3: Test It!
```bash
# Open Mission Control
open http://localhost:3006

# 1. Create or open a task
# 2. Assign it to Johnny
# 3. Check that "👁️ 1" appears on the card
# 4. Open task detail → see "Watching (1)" section
# 5. Post a comment from another agent
# 6. Watch daemon logs: pm2 logs notification-daemon
# 7. Verify Johnny gets notified
```

---

## 🎯 Key Features to Try

### 1. Subscribe to a Task
1. Open any task detail dialog
2. Click **"SUBSCRIBE"** button (top right of subscription section)
3. See yourself added to the "Watching (X)" list
4. Close and reopen → "👁️ X" count increased on card

### 2. Auto-Subscribe via Comment
1. Open a task you're NOT subscribed to
2. Post a comment (no need to @mention anyone)
3. You're now auto-subscribed!
4. Other subscribers get notified of your comment

### 3. Assignment Notification
1. Create a new task
2. Assign it to an agent (e.g., Johnny)
3. Check notifications table:
   ```sql
   SELECT * FROM notifications 
   WHERE type = 'task_assigned' 
   ORDER BY created_at DESC LIMIT 5;
   ```
4. Verify `delivered` field transitions to `true` after daemon processes it
5. Johnny is now auto-subscribed to the task

### 4. Unsubscribe
1. Open task detail
2. Click **"UNSUBSCRIBE"** button
3. You're removed from the watcher list
4. You won't receive future comment notifications (unless @mentioned)

---

## 🔍 Verify Everything Works

### Check Database Tables
```sql
-- Subscriptions exist?
SELECT COUNT(*) FROM task_subscriptions;

-- Notifications being created?
SELECT COUNT(*) FROM notifications WHERE delivered = false;

-- Recent activity?
SELECT * FROM task_subscriptions ORDER BY subscribed_at DESC LIMIT 5;
```

### Check API Endpoints
```bash
# Health check
curl http://localhost:3006/api/tasks/subscribe

# Get subscribers for a task
curl http://localhost:3006/api/tasks/subscribe?taskId=YOUR_TASK_ID

# Get comments for a task
curl http://localhost:3006/api/tasks/comments?taskId=YOUR_TASK_ID
```

### Check Notification Daemon
```bash
# Watch live logs
pm2 logs notification-daemon --lines 50

# Expected output:
# ✅ Delivered X notifications
# 💤 No pending notifications
```

---

## 🐛 Troubleshooting

### Problem: "👁️" not showing on cards
**Solution:** Hard refresh the page (Cmd+Shift+R or Ctrl+Shift+F5)

### Problem: Notifications not being delivered
**Check:**
```bash
# 1. Is daemon running?
pm2 list | grep notification-daemon

# 2. Check daemon logs
pm2 logs notification-daemon

# 3. Check for undelivered notifications
psql $DATABASE_URL -c "SELECT COUNT(*) FROM notifications WHERE delivered = false;"

# 4. Manually trigger delivery
curl -X POST http://localhost:3006/api/notifications/deliver \
  -H "Authorization: Basic $(echo -n 'lucas:Spartansneverdie!1' | base64)"
```

### Problem: Subscribe button not working
**Check browser console for errors:**
1. Open DevTools (F12)
2. Go to Console tab
3. Click subscribe button
4. Look for red error messages

### Problem: TypeScript errors
```bash
# Recompile
cd /home/seed/clawd/mission-control-v2
npm run build

# Check specific files
npx tsc --noEmit
```

---

## 📊 Success Metrics

After deployment, you should see:

✅ **Task cards show "👁️ X"** where X > 0 for active tasks  
✅ **Daemon logs show deliveries** every ~2 seconds  
✅ **Agents get notified** when tasks are assigned  
✅ **Subscribers get notified** when comments are posted  
✅ **No @mentions needed** for routine thread conversations  

---

## 📖 Next Steps

1. ✅ Deploy Phase 1 + 10 (this guide)
2. 📋 Test with real workflows for 24-48 hours
3. 📊 Gather feedback from Lucas and agents
4. 🔧 Phase 2: Implement agent heartbeat cron jobs
5. 🎭 Phase 4: Create per-agent SOUL files
6. 💰 Phase 6: Optimize costs with model switching

---

## 📞 Need Help?

- **Docs:** `PHASE1-10-IMPLEMENTATION.md` (detailed technical docs)
- **Summary:** `IMPLEMENTATION_SUMMARY.md` (architecture overview)
- **Code:** Check API routes in `app/api/tasks/`
- **Database:** `scripts/phase1-10-migration.sql`

---

**🚀 Ready? Let's ship it!**

```bash
# Run this now:
pm2 restart mission-control-v2 notification-daemon && \
echo "✅ Services restarted! Visit http://localhost:3006"
```
