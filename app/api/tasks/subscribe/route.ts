import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Subscribe/unsubscribe an agent to/from a task thread
 * 
 * POST /api/tasks/subscribe
 * Body: { taskId: string, agentId: string, action: 'subscribe' | 'unsubscribe' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, agentId, action = 'subscribe' } = body;

    if (!taskId || !agentId) {
      return NextResponse.json(
        { error: 'taskId and agentId are required' },
        { status: 400 }
      );
    }

    if (action === 'unsubscribe') {
      // Unsubscribe
      const { error } = await supabase
        .from('task_subscriptions')
        .delete()
        .eq('task_id', taskId)
        .eq('agent_id', agentId);

      if (error) {
        console.error('Failed to unsubscribe:', error);
        return NextResponse.json(
          { error: 'Failed to unsubscribe' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        action: 'unsubscribed',
        message: 'Unsubscribed from task thread' 
      });
    } else {
      // Subscribe (upsert to handle duplicates)
      const { error } = await supabase
        .from('task_subscriptions')
        .upsert(
          { task_id: taskId, agent_id: agentId },
          { onConflict: 'task_id,agent_id' }
        );

      if (error) {
        console.error('Failed to subscribe:', error);
        return NextResponse.json(
          { error: 'Failed to subscribe' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        action: 'subscribed',
        message: 'Subscribed to task thread' 
      });
    }
  } catch (error: any) {
    console.error('Subscribe API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get subscribers for a task
 * 
 * GET /api/tasks/subscribe?taskId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      );
    }

    const { data: subscriptions, error } = await supabase
      .from('task_subscriptions')
      .select(`
        id,
        subscribed_at,
        agent:agents!task_subscriptions_agent_id_fkey(
          id,
          name,
          avatar_emoji,
          status
        )
      `)
      .eq('task_id', taskId)
      .order('subscribed_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch subscribers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscribers' },
        { status: 500 }
      );
    }

    // Flatten the structure for easier use
    const subscribers = subscriptions?.map(sub => {
      const agent = Array.isArray(sub.agent) ? sub.agent[0] : sub.agent;
      return {
        id: sub.id,
        subscribed_at: sub.subscribed_at,
        agent_id: agent.id,
        agent_name: agent.name,
        agent_avatar: agent.avatar_emoji,
        agent_status: agent.status,
      };
    }) || [];

    return NextResponse.json({ 
      taskId,
      count: subscribers.length,
      subscribers 
    });
  } catch (error: any) {
    console.error('Get subscribers API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
