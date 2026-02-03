import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseMentions } from '@/lib/mention-parser';

/**
 * Activities API
 * Creates new activities and broadcasts them via SSE
 * Also parses @mentions and creates notifications
 */

interface CreateActivityRequest {
  type: 'task' | 'agent' | 'system' | 'mention';
  message: string;
  agent: string;
  agentAvatar?: string;
  metadata?: {
    taskId?: string;
    taskTitle?: string;
    mentionedUsers?: string[];
  };
}

// In-memory store for SSE connections (simple implementation)
// In production, use Redis or similar
const connections = new Set<ReadableStreamDefaultController>();

// Export helper functions for SSE route
export function addSSEConnection(controller: ReadableStreamDefaultController) {
  connections.add(controller);
}

export function removeSSEConnection(controller: ReadableStreamDefaultController) {
  connections.delete(controller);
}

function broadcastActivity(activity: any) {
  const encoder = new TextEncoder();
  const data = encoder.encode(`data: ${JSON.stringify({ type: 'activity', activity })}\n\n`);
  
  connections.forEach((controller) => {
    try {
      controller.enqueue(data);
    } catch (error) {
      console.error('Failed to send to SSE connection:', error);
      connections.delete(controller);
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateActivityRequest = await request.json();

    // Validate required fields
    if (!body.message || !body.agent || !body.type) {
      return NextResponse.json(
        { error: 'Missing required fields: message, agent, type' },
        { status: 400 }
      );
    }

    // Create activity object
    const activity = {
      id: crypto.randomUUID(),
      type: body.type,
      message: body.message,
      agent: body.agent,
      agentAvatar: body.agentAvatar,
      timestamp: new Date().toISOString(),
      metadata: body.metadata || {},
    };

    // Parse @mentions if the message contains them
    if (body.message.includes('@') && body.metadata?.taskId && body.metadata?.taskTitle) {
      await parseMentions(body.message, {
        taskId: body.metadata.taskId,
        taskTitle: body.metadata.taskTitle,
        mentionedBy: body.agent,
        link: `/tasks/${body.metadata.taskId}`,
      });
    }

    // Broadcast to all SSE connections
    broadcastActivity(activity);

    // Optionally store in database for persistence
    // await supabase.from('activities').insert(activity);

    return NextResponse.json({ success: true, activity });
  } catch (error: any) {
    console.error('Error creating activity:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve recent activities
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // If you're storing activities in DB, fetch them here
    // const { data, error } = await supabase
    //   .from('activities')
    //   .select('*')
    //   .order('timestamp', { ascending: false })
    //   .limit(limit);

    // For now, return a simple message
    return NextResponse.json({
      message: 'Activities endpoint - use POST to create new activities',
      connections: connections.size,
    });
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
