import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parseMentions } from '@/lib/mention-parser';

/**
 * Create a comment on a task
 * - Auto-subscribes the commenter to the task thread
 * - Notifies all subscribers (except the commenter)
 * - Parses and handles @mentions
 * 
 * POST /api/tasks/comments
 * Body: { taskId: string, authorId: string, message: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, authorId, message } = body;

    if (!taskId || !authorId || !message) {
      return NextResponse.json(
        { error: 'taskId, authorId, and message are required' },
        { status: 400 }
      );
    }

    // 1. Fetch author info
    const { data: author, error: authorError } = await supabase
      .from('agents')
      .select('id, name')
      .eq('id', authorId)
      .single();

    if (authorError || !author) {
      return NextResponse.json(
        { error: 'Author not found' },
        { status: 404 }
      );
    }

    // 2. Fetch task info
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // 3. Create the comment
    const { data: comment, error: commentError } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        author: author.name,
        message: message.trim(),
      })
      .select()
      .single();

    if (commentError || !comment) {
      console.error('Failed to create comment:', commentError);
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      );
    }

    // 4. Auto-subscribe the commenter to the task thread
    await supabase
      .from('task_subscriptions')
      .upsert(
        { task_id: taskId, agent_id: authorId },
        { onConflict: 'task_id,agent_id' }
      );

    // 5. Get all subscribers (excluding the commenter)
    const { data: subscriptions } = await supabase
      .from('task_subscriptions')
      .select('agent_id')
      .eq('task_id', taskId)
      .neq('agent_id', authorId);

    // 6. Create notifications for all subscribers
    if (subscriptions && subscriptions.length > 0) {
      const subscriberNotifications = subscriptions.map(sub => ({
        user_id: sub.agent_id,
        type: 'mention' as const,
        title: `New comment on: ${task.title}`,
        message: `${author.name}: ${message.slice(0, 150)}${message.length > 150 ? '...' : ''}`,
        read: false,
        delivered: false,
        metadata: {
          task_id: taskId,
          task_title: task.title,
          mentioned_by: author.name,
          comment_id: comment.id,
          link: `/tasks/${taskId}`,
        },
      }));

      await supabase
        .from('notifications')
        .insert(subscriberNotifications);
    }

    // 7. Parse @mentions and create additional notifications
    await parseMentions(message, {
      taskId: taskId,
      taskTitle: task.title,
      mentionedBy: author.name,
      messageId: comment.id,
      link: `/tasks/${taskId}`,
    });

    return NextResponse.json({
      success: true,
      comment,
      subscribersNotified: subscriptions?.length || 0,
    });
  } catch (error: any) {
    console.error('Comment API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get comments for a task
 * 
 * GET /api/tasks/comments?taskId=xxx
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

    const { data: comments, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch comments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      taskId,
      count: comments?.length || 0,
      comments: comments || [],
    });
  } catch (error: any) {
    console.error('Get comments API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
