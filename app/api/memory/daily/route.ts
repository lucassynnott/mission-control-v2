import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Daily notes generation endpoint
 * 
 * POST: Generate memory/YYYY-MM-DD.md for specified agent
 * 
 * Compiles:
 * - Tasks completed
 * - Tasks started
 * - Comments made
 * - Decisions logged
 * - Links to Mission Control
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent, date } = body;

    if (!agent) {
      return NextResponse.json({ error: 'Agent name required' }, { status: 400 });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const startOfDay = `${targetDate}T00:00:00Z`;
    const endOfDay = `${targetDate}T23:59:59Z`;

    // Fetch agent details
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('name', agent)
      .single();

    if (agentError || !agentData) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Fetch tasks completed today
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('assignee', agent)
      .eq('column_status', 'done')
      .gte('updated_at', startOfDay)
      .lte('updated_at', endOfDay)
      .order('updated_at', { ascending: false });

    // Fetch tasks started today
    const { data: startedTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('assignee', agent)
      .in('column_status', ['in_progress', 'review'])
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false });

    // Fetch activities (comments, updates) today
    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('agent', agent)
      .gte('timestamp', startOfDay)
      .lte('timestamp', endOfDay)
      .order('timestamp', { ascending: true });

    // Generate markdown content
    const content = generateDailyNote(targetDate, agent, {
      completed: completedTasks || [],
      started: startedTasks || [],
      activities: activities || [],
    });

    // Write to agent's memory folder
    const workspacePath = getAgentWorkspace(agent);
    const memoryDir = path.join(workspacePath, 'memory');
    const notePath = path.join(memoryDir, `${targetDate}.md`);

    await fs.mkdir(memoryDir, { recursive: true });
    await fs.writeFile(notePath, content, 'utf-8');

    return NextResponse.json({
      success: true,
      agent,
      date: targetDate,
      path: notePath,
      stats: {
        completed: completedTasks?.length || 0,
        started: startedTasks?.length || 0,
        activities: activities?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Failed to generate daily note:', error);
    return NextResponse.json(
      { error: 'Failed to generate daily note', details: error.message },
      { status: 500 }
    );
  }
}

function getAgentWorkspace(agentName: string): string {
  const workspaceBase = process.env.OPENCLAW_WORKSPACES_DIR || '/home/seed/.openclaw';
  const agentSlug = agentName.toLowerCase().replace(/\s+/g, '-');
  return path.join(workspaceBase, `workspace-${agentSlug}`);
}

interface DailyData {
  completed: any[];
  started: any[];
  activities: any[];
}

function generateDailyNote(date: string, agentName: string, data: DailyData): string {
  const { completed, started, activities } = data;
  
  let content = `# ${date} - ${agentName} Daily Log\n\n`;

  // Summary
  content += `## Summary\n\n`;
  content += `- **Tasks Completed:** ${completed.length}\n`;
  content += `- **Tasks Started:** ${started.length}\n`;
  content += `- **Activities Logged:** ${activities.length}\n\n`;

  // Completed Tasks
  if (completed.length > 0) {
    content += `## ✅ Completed Tasks\n\n`;
    completed.forEach(task => {
      content += `### ${task.title}\n`;
      content += `- **Priority:** ${task.priority.toUpperCase()}\n`;
      content += `- **Completed:** ${new Date(task.updated_at).toLocaleTimeString()}\n`;
      if (task.description) {
        content += `- **Description:** ${task.description.slice(0, 150)}${task.description.length > 150 ? '...' : ''}\n`;
      }
      content += `- **[View in Mission Control](${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3006'}/tasks/${task.id})**\n\n`;
    });
  }

  // Started Tasks
  if (started.length > 0) {
    content += `## 🔄 Started Tasks\n\n`;
    started.forEach(task => {
      content += `### ${task.title}\n`;
      content += `- **Priority:** ${task.priority.toUpperCase()}\n`;
      content += `- **Status:** ${task.column_status.replace('_', ' ').toUpperCase()}\n`;
      content += `- **Started:** ${new Date(task.created_at).toLocaleTimeString()}\n`;
      content += `- **[View in Mission Control](${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3006'}/tasks/${task.id})**\n\n`;
    });
  }

  // Key Activities
  if (activities.length > 0) {
    content += `## 📝 Key Activities\n\n`;
    
    // Group by type
    const byType: Record<string, any[]> = {};
    activities.forEach(activity => {
      if (!byType[activity.type]) byType[activity.type] = [];
      byType[activity.type].push(activity);
    });

    Object.entries(byType).forEach(([type, acts]) => {
      content += `### ${type.toUpperCase()}\n`;
      acts.slice(0, 10).forEach(activity => {
        const time = new Date(activity.timestamp).toLocaleTimeString();
        content += `- **${time}** - ${activity.message}\n`;
      });
      if (acts.length > 10) {
        content += `- *...and ${acts.length - 10} more*\n`;
      }
      content += `\n`;
    });
  }

  // Footer
  content += `---\n\n`;
  content += `*Generated by Mission Control v2.0*  \n`;
  content += `*${new Date().toISOString()}*\n`;

  return content;
}
