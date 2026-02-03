import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Create a new task
 * POST /api/tasks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Auto-set status to 'todo' (ASSIGNED) if assignee is provided
    let columnStatus = body.column_status || 'backlog';
    if (body.assignee && columnStatus === 'backlog') {
      columnStatus = 'todo';
    }
    
    const { data: task, error} = await supabase
      .from('tasks')
      .insert({
        title: body.title,
        description: body.description || '',
        column_status: columnStatus,
        priority: body.priority || 'medium',
        assignee: body.assignee || null,
        project_tag: body.project_tag || 'Mission Control',
        position: body.position || 0,
        due_date: body.due_date || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create task:', error);
      return NextResponse.json(
        { error: 'Failed to create task', details: error.message },
        { status: 500 }
      );
    }

    // If task is assigned, handle assignment logic
    if (body.assignee && task) {
      await handleTaskAssignment(task.id, body.assignee, task.title);
    }

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error('Create task API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Update a task
 * PATCH /api/tasks/:id
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Fetch current task to detect assignment changes
    const { data: currentTask } = await supabase
      .from('tasks')
      .select('assignee, title, column_status')
      .eq('id', id)
      .single();

    // Auto-move to 'todo' (ASSIGNED) if assigning from backlog
    if (updates.assignee && currentTask?.column_status === 'backlog' && !updates.column_status) {
      updates.column_status = 'todo';
    }

    // Update the task
    const { data: task, error } = await supabase
      .from('tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update task:', error);
      return NextResponse.json(
        { error: 'Failed to update task', details: error.message },
        { status: 500 }
      );
    }

    // Check if assignee changed
    if (currentTask && updates.assignee && currentTask.assignee !== updates.assignee) {
      await handleTaskAssignment(id, updates.assignee, task.title);
    }

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error('Update task API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get tasks with optional filters
 * GET /api/tasks?assignee=xxx&status=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assignee = searchParams.get('assignee');
    const status = searchParams.get('status');

    let query = supabase.from('tasks').select('*').order('position');

    if (assignee) {
      query = query.eq('assignee', assignee);
    }

    if (status) {
      const statuses = status.split(',');
      query = query.in('column_status', statuses);
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Failed to fetch tasks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tasks: tasks || [] });
  } catch (error: any) {
    console.error('Get tasks API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle task assignment:
 * 1. Create notification for new assignee
 * 2. Auto-subscribe them to the task thread
 */
async function handleTaskAssignment(taskId: string, assigneeName: string, taskTitle: string) {
  try {
    // Find the agent by name
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name')
      .eq('name', assigneeName)
      .single();

    if (agentError || !agent) {
      console.error('Assignee not found:', assigneeName);
      return;
    }

    // 1. Create notification for new assignee
    await supabase
      .from('notifications')
      .insert({
        user_id: agent.id,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You've been assigned to: ${taskTitle}`,
        read: false,
        delivered: false,
        metadata: {
          task_id: taskId,
          task_title: taskTitle,
          link: `/tasks/${taskId}`,
        },
      });

    // 2. Auto-subscribe them to the task thread
    await supabase
      .from('task_subscriptions')
      .upsert(
        { task_id: taskId, agent_id: agent.id },
        { onConflict: 'task_id,agent_id' }
      );

    console.log(`Task ${taskId} assigned to ${assigneeName}. Notification created and auto-subscribed.`);
  } catch (error) {
    console.error('Error handling task assignment:', error);
  }
}
