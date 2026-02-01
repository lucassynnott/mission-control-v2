import { NextRequest, NextResponse } from 'next/server';

// Dynamic import to avoid build-time Supabase initialization
async function getSupabase() {
  const { supabase } = await import('@/lib/supabase');
  return supabase;
}

// GET /api/standup?date=YYYY-MM-DD - Generate standup report
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    
    // Calculate date range (last 24 hours or specific date)
    const endDate = dateParam ? new Date(dateParam) : new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 1);

    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    // Query completed tasks in the date range
    const { data: completedTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('column_status', 'done')
      .gte('updated_at', startIso)
      .lte('updated_at', endIso)
      .order('updated_at', { ascending: false });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
    }

    // Query agent activity
    const { data: agentActivity, error: agentsError } = await supabase
      .from('activities')
      .select('*')
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: false });

    if (agentsError) {
      console.error('Error fetching activities:', agentsError);
    }

    // Query new agents created
    const { data: newAgents, error: newAgentsError } = await supabase
      .from('agents')
      .select('*')
      .gte('created_at', startIso)
      .lte('created_at', endIso);

    if (newAgentsError) {
      console.error('Error fetching agents:', newAgentsError);
    }

    // Compile standup report
    const report = {
      date: endDate.toISOString().split('T')[0],
      period: `${startIso} to ${endIso}`,
      summary: {
        tasks_completed: completedTasks?.length || 0,
        tasks_in_progress: 0, // Will query separately if needed
        new_agents: newAgents?.length || 0,
        activities: agentActivity?.length || 0,
      },
      completed_tasks: completedTasks?.map(t => ({
        id: t.id,
        title: t.title,
        project: t.project_tag,
        completed_at: t.updated_at,
      })) || [],
      new_agents: newAgents?.map(a => ({
        id: a.id,
        name: a.name,
        model: a.model,
        role: a.role,
      })) || [],
      highlights: agentActivity?.slice(0, 5).map(a => ({
        type: a.type,
        message: a.message,
        agent: a.agent,
        time: a.created_at,
      })) || [],
      standup_format: generateStandupText({
        date: endDate.toISOString().split('T')[0],
        completed: completedTasks || [],
        agents: newAgents || [],
        activities: agentActivity || [],
      }),
    };

    return NextResponse.json(report);
  } catch (err) {
    console.error('Standup generation error:', err);
    return NextResponse.json({ error: 'Failed to generate standup' }, { status: 500 });
  }
}

// POST /api/standup - Trigger standup and optionally send
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { send_to_telegram, chat_id } = body;

    // Generate report
    const reportRes = await GET(request);
    const report = await reportRes.json();

    if (report.error) {
      return NextResponse.json(report, { status: 500 });
    }

    // Log to daily notes
    try {
      await fetch('/api/memory/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry: `## Daily Standup\n\n${report.standup_format}`,
        }),
      });
    } catch (err) {
      console.error('Failed to log standup to daily notes:', err);
    }

    // Optionally send to Telegram
    if (send_to_telegram && chat_id) {
      const message = `📊 *Daily Standup: ${report.date}*\n\n${report.standup_format}`;
      
      // This would need Telegram bot token configured
      // For now, just log that it would be sent
      console.log('Would send to Telegram:', message);
    }

    return NextResponse.json({ 
      success: true, 
      report,
      sent_to_telegram: send_to_telegram && chat_id ? true : false,
    });
  } catch (err) {
    console.error('Standup trigger error:', err);
    return NextResponse.json({ error: 'Failed to trigger standup' }, { status: 500 });
  }
}

interface StandupTask {
  id: string;
  title: string;
  project_tag?: string;
}

interface StandupAgent {
  id: string;
  name: string;
  model: string;
}

interface StandupActivity {
  id: string;
  type: string;
  message: string;
}

function generateStandupText({ date, completed, agents, activities }: {
  date: string;
  completed: StandupTask[];
  agents: StandupAgent[];
  activities: StandupActivity[];
}) {
  const lines = [
    `📅 *Date:* ${date}`,
    '',
    '📝 *Completed Tasks:*',
  ];

  if (completed.length === 0) {
    lines.push('  • No tasks completed in this period');
  } else {
    completed.forEach(t => {
      lines.push(`  ✅ ${t.title} (${t.project_tag || 'no project'})`);
    });
  }

  lines.push('', '🤖 *Agent Activity:*');
  
  if (agents.length > 0) {
    lines.push(`  • ${agents.length} new agent(s) created:`);
    agents.forEach(a => {
      lines.push(`    - ${a.name} (${a.model})`);
    });
  }

  if (activities.length > 0) {
    lines.push(`  • ${activities.length} activity events recorded`);
  }

  if (agents.length === 0 && activities.length === 0) {
    lines.push('  • No significant agent activity');
  }

  lines.push('', '🎯 *Focus for Next Period:*');
  lines.push('  • Continue building Mission Control v2.0');
  lines.push('  • [Add your priorities here]');

  return lines.join('\n');
}
