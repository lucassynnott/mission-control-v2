import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Webhook handler for agent creation events from OpenClaw
 * 
 * Expected payload:
 * {
 *   "name": "agent-name",
 *   "role": "role-description",
 *   "model": "model-name",
 *   "session_key": "agent:name:main",
 *   "avatar_emoji": "🤖"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    // Validate required fields
    const { name, role, model, session_key, avatar_emoji } = payload;
    
    if (!name || !role || !model || !session_key) {
      return NextResponse.json(
        { error: 'Missing required fields: name, role, model, session_key' },
        { status: 400 }
      );
    }

    // Check if agent already exists
    const { data: existing } = await supabase
      .from('agents')
      .select('id')
      .eq('session_key', session_key)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Agent with this session_key already exists', id: existing.id },
        { status: 409 }
      );
    }

    // Insert new agent
    const { data: agent, error: insertError } = await supabase
      .from('agents')
      .insert({
        name,
        role,
        model,
        session_key,
        status: 'idle',
        avatar_emoji: avatar_emoji || '🤖',
        tokens_used: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert agent:', insertError);
      return NextResponse.json(
        { error: 'Failed to create agent', details: insertError.message },
        { status: 500 }
      );
    }

    // Create activity feed entry
    const activityPayload = {
      type: 'agent',
      message: `Agent "${name}" deployed`,
      agent: 'System',
      timestamp: new Date().toISOString(),
      metadata: {
        agent_id: agent.id,
        agent_name: name,
        model,
      },
    };

    // Broadcast to SSE clients via activities table (if you have one)
    // Or just return success - SSE will pick up from agents table subscription
    await supabase.from('activities').insert(activityPayload).select().single();

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        session_key: agent.session_key,
      },
    });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to test if webhook is alive
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/webhooks/agent-created',
    method: 'POST',
    status: 'online',
    required_fields: ['name', 'role', 'model', 'session_key'],
    optional_fields: ['avatar_emoji'],
  });
}
