#!/usr/bin/env ts-node

/**
 * Notification Daemon
 * Polls /api/notifications/deliver every 2 seconds to deliver pending notifications
 * 
 * Run: ts-node scripts/notification-daemon.ts
 * Or via PM2: pm2 start ecosystem.config.js
 */

const POLL_INTERVAL_MS = 2000;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3006';
const SERVICE_CLIENT_ID = process.env.SERVICE_CLIENT_ID || 'b3d10235afaf5f66d48fd95857261125.access';
const SERVICE_CLIENT_SECRET = process.env.SERVICE_CLIENT_SECRET || '1c49e8bd150d8c60b845891e90ef52261db6593db91a8324a06f3f78d47d6c27';

let isPolling = false;

async function pollNotifications() {
  if (isPolling) {
    console.log('[DAEMON] Previous poll still in progress, skipping...');
    return;
  }

  isPolling = true;
  const timestamp = new Date().toISOString();

  try {
    console.log(`[${timestamp}] Polling ${API_URL}/api/notifications/deliver`);

    const response = await fetch(`${API_URL}/api/notifications/deliver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Access-Client-Id': SERVICE_CLIENT_ID,
        'CF-Access-Client-Secret': SERVICE_CLIENT_SECRET,
      },
    });

    console.log(`[${timestamp}] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${timestamp}] ❌ HTTP ${response.status}: ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log(`[${timestamp}] Response data:`, JSON.stringify(result));
    
    if (result.delivered > 0) {
      console.log(`[${timestamp}] ✅ Delivered ${result.delivered} notifications`);
    }

    if (result.failed > 0) {
      console.error(`[${timestamp}] ⚠️  Failed to deliver ${result.failed} notifications`);
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((err: string) => console.error(`   - ${err}`));
      }
    }

    if (result.delivered === 0 && result.failed === 0) {
      console.log(`[${timestamp}] 💤 No pending notifications`);
    }
  } catch (error: any) {
    console.error(`[${timestamp}] 🔥 Polling error:`, error.message);
  } finally {
    isPolling = false;
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[DAEMON] Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[DAEMON] Received SIGTERM, shutting down...');
  process.exit(0);
});

// Start daemon
console.log('='.repeat(60));
console.log('🚀 Mission Control Notification Daemon');
console.log(`   Polling: ${API_URL}/api/notifications/deliver`);
console.log(`   Interval: ${POLL_INTERVAL_MS}ms (${POLL_INTERVAL_MS / 1000}s)`);
console.log('='.repeat(60));

// Poll immediately on startup
pollNotifications();

// Then poll at regular intervals
setInterval(pollNotifications, POLL_INTERVAL_MS);
