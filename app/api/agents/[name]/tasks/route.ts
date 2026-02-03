import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/agents/[name]/tasks
 * Returns tasks assigned to a specific agent
 * Auth is handled by middleware
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const agentName = params.name;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'todo,in_progress';

    // Find agent by name (case-insensitive)
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name')
      .ilike('name', agentName)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Fetch tasks assigned to this agent (by name, not ID)
    const statuses = status.split(',').map(s => s.trim());
    
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('assignee', agent.name)
      .in('column_status', statuses)
      .order('updated_at', { ascending: false });

    if (tasksError) {
      console.error('Failed to fetch tasks:', tasksError);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    return NextResponse.json({
      agent: agent.name,
      count: tasks?.length || 0,
      tasks: tasks || [],
    });
  } catch (error: any) {
    console.error('Tasks fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
