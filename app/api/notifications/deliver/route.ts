import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Notification status endpoint
 * Returns count of pending notifications
 * 
 * NOTE: Agents poll for notifications during heartbeat - not pushed.
 * This endpoint provides monitoring/stats only.
 */
export async function POST(request: NextRequest) {
  try {
    // Fetch unread notifications
    const { data: notifications, error: fetchError } = await supabase
      .from('notifications')
      .select(`
        *,
        agent:agents!user_id(name)
      `)
      .eq('read', false)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Failed to fetch notifications:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ pending: 0, message: 'No pending notifications' });
    }

    // Count by agent
    const byAgent: Record<string, number> = {};
    notifications.forEach(n => {
      const agentName = n.agent?.name || 'unknown';
      byAgent[agentName] = (byAgent[agentName] || 0) + 1;
    });

    return NextResponse.json({
      pending: notifications.length,
      byAgent,
      message: `${notifications.length} notification(s) waiting to be picked up by agents during heartbeat`
    });
  } catch (error: any) {
    console.error('Notification status error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint for status check
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/notifications/deliver',
    method: 'POST',
    description: 'Returns count of pending notifications. Agents poll during heartbeat.',
    status: 'online',
  });
}
