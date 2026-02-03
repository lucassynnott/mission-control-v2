import { NextRequest, NextResponse } from 'next/server';

// Dynamic import to avoid build-time Supabase initialization
async function getSupabase() {
  const { supabase } = await import('@/lib/supabase');
  return supabase;
}

// GET /api/notifications?user_id=xxx&unread_only=true
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!userId) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    // Resolve agent name to UUID if needed
    let resolvedUserId = userId;
    if (!userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // Not a UUID, assume it's an agent name - resolve it
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .eq('name', userId)
        .single();
      
      if (agentError || !agent) {
        console.error('Failed to resolve agent name to UUID:', userId);
        return NextResponse.json({ notifications: [] }); // Return empty instead of error
      }
      
      resolvedUserId = agent.id;
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', resolvedUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notifications: data });
  } catch (err) {
    console.error('GET error:', err);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}

// POST /api/notifications - Create a notification
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const body = await request.json();
    const { user_id, type, title, message, metadata } = body;

    if (!user_id || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, type, title, message' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id,
        type,
        title,
        message,
        metadata: metadata || {},
        read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notification: data }, { status: 201 });
  } catch (err) {
    console.error('Notification creation error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/notifications - Mark as read (bulk or single)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const body = await request.json();
    const { notification_id, user_id, mark_all } = body;

    if (mark_all && user_id) {
      // Mark all as read for user
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('user_id', user_id)
        .eq('read', false);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (notification_id) {
      // Mark single as read
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notification_id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'notification_id or (mark_all + user_id) required' }, { status: 400 });
  } catch (err) {
    console.error('Notification update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
