import { supabase } from './supabase';

/**
 * Parse @mentions from text and create notifications
 * 
 * Usage:
 * await parseMentions(messageText, {
 *   taskId: task.id,
 *   taskTitle: task.title,
 *   mentionedBy: currentAgent.name,
 * });
 */

interface MentionContext {
  taskId?: string;
  taskTitle?: string;
  mentionedBy?: string;
  messageId?: string;
  link?: string;
}

export async function parseMentions(text: string, context: MentionContext): Promise<void> {
  // Extract all @mentions from text
  const mentionRegex = /@(\w+[-\w]*)/g;
  const mentions = Array.from(text.matchAll(mentionRegex)).map(match => match[1]);

  if (mentions.length === 0) return;

  // Remove duplicates
  const uniqueMentions = Array.from(new Set(mentions));

  // Fetch agents by name
  const { data: agents, error } = await supabase
    .from('agents')
    .select('id, name')
    .in('name', uniqueMentions);

  if (error || !agents || agents.length === 0) {
    console.error('Failed to fetch mentioned agents:', error);
    return;
  }

  // Create notifications for each mentioned agent
  const notifications = agents.map(agent => ({
    user_id: agent.id,
    type: 'mention' as const,
    title: `Mentioned in ${context.taskTitle || 'a task'}`,
    message: text.slice(0, 200), // First 200 chars
    read: false,
    metadata: {
      task_id: context.taskId,
      task_title: context.taskTitle,
      mentioned_by: context.mentionedBy,
      message_id: context.messageId,
      link: context.link || (context.taskId ? `/tasks/${context.taskId}` : undefined),
    },
  }));

  const { error: insertError } = await supabase
    .from('notifications')
    .insert(notifications);

  if (insertError) {
    console.error('Failed to create mention notifications:', insertError);
  } else {
    console.log(`Created ${notifications.length} mention notifications`);
  }
}

/**
 * Highlight @mentions in text for UI display
 */
export function highlightMentions(text: string): string {
  return text.replace(
    /@(\w+[-\w]*)/g,
    '<span class="text-cyber-cyan font-bold">@$1</span>'
  );
}

/**
 * Extract all unique mentions from text
 */
export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+[-\w]*)/g;
  const mentions = Array.from(text.matchAll(mentionRegex)).map(match => match[1]);
  return Array.from(new Set(mentions));
}
