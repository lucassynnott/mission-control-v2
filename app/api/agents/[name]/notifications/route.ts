import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/agents/[name]/notifications
 * Returns unread notifications for a specific agent
 * Auth is handled by middleware
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const agentName = params.name;

    // Find agent by name (case-insensitive)
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name')
      .ilike('name', agentName)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Fetch unread notifications for this agent
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', agent.id)
      .eq('read', false)
      .order('created_at', { ascending: false });

    if (notifError) {
      console.error('Failed to fetch notifications:', notifError);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    return NextResponse.json({
      agent: agent.name,
      unread: notifications?.length || 0,
      notifications: notifications || [],
    });
  } catch (error: any) {
    console.error('Notification fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/[name]/notifications/mark-read
 * Mark notifications as read
 * Auth is handled by middleware
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const agentName = params.name;
    const body = await request.json();
    const { notificationIds } = body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json({ error: 'notificationIds array required' }, { status: 400 });
    }

    // Find agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .ilike('name', agentName)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Mark as read
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .in('id', notificationIds)
      .eq('user_id', agent.id);

    if (updateError) {
      console.error('Failed to mark notifications as read:', updateError);
      return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      marked: notificationIds.length,
      message: `Marked ${notificationIds.length} notification(s) as read`,
    });
  } catch (error: any) {
    console.error('Mark read error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
