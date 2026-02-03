import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * WORKING.md sync endpoint
 * 
 * GET: Read agent's WORKING.md
 * POST: Update agent's WORKING.md with current task status
 * DELETE: Clear WORKING.md (task completed/archived)
 * 
 * Flow:
 * - Agent completes task update in Mission Control
 * - UI calls this endpoint to sync WORKING.md
 * - Agent's workspace file is updated
 * - Returns updated content
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const agentName = searchParams.get('agent');

  if (!agentName) {
    return NextResponse.json({ error: 'Agent name required' }, { status: 400 });
  }

  try {
    // Construct path to agent workspace
    const workspacePath = getAgentWorkspace(agentName);
    const workingPath = path.join(workspacePath, 'WORKING.md');

    // Check if file exists
    try {
      const content = await fs.readFile(workingPath, 'utf-8');
      return NextResponse.json({ agent: agentName, content, path: workingPath });
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        // File doesn't exist, return template
        const template = generateWorkingTemplate();
        return NextResponse.json({ agent: agentName, content: template, exists: false });
      }
      throw err;
    }
  } catch (error: any) {
    console.error('Failed to read WORKING.md:', error);
    return NextResponse.json(
      { error: 'Failed to read WORKING.md', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent, taskId } = body;

    if (!agent) {
      return NextResponse.json({ error: 'Agent name required' }, { status: 400 });
    }

    // Fetch current task details
    let taskDetails = null;
    if (taskId) {
      const { data: task, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (!error && task) {
        taskDetails = task;
      }
    }

    // Generate WORKING.md content
    const content = generateWorkingContent(agent, taskDetails);

    // Write to agent workspace
    const workspacePath = getAgentWorkspace(agent);
    const workingPath = path.join(workspacePath, 'WORKING.md');

    await fs.mkdir(workspacePath, { recursive: true });
    await fs.writeFile(workingPath, content, 'utf-8');

    return NextResponse.json({
      success: true,
      agent,
      path: workingPath,
      task: taskDetails ? taskDetails.title : null,
    });
  } catch (error: any) {
    console.error('Failed to update WORKING.md:', error);
    return NextResponse.json(
      { error: 'Failed to update WORKING.md', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const agentName = searchParams.get('agent');

  if (!agentName) {
    return NextResponse.json({ error: 'Agent name required' }, { status: 400 });
  }

  try {
    // Construct path to agent workspace
    const workspacePath = getAgentWorkspace(agentName);
    const workingPath = path.join(workspacePath, 'WORKING.md');

    // Clear WORKING.md by writing the template
    const template = generateWorkingTemplate();
    await fs.writeFile(workingPath, template, 'utf-8');

    return NextResponse.json({
      success: true,
      agent: agentName,
      path: workingPath,
      message: 'WORKING.md cleared',
    });
  } catch (error: any) {
    console.error('Failed to clear WORKING.md:', error);
    return NextResponse.json(
      { error: 'Failed to clear WORKING.md', details: error.message },
      { status: 500 }
    );
  }
}

function getAgentWorkspace(agentName: string): string {
  // Map agent names to workspace paths
  const workspaceBase = process.env.OPENCLAW_WORKSPACES_DIR || '/home/seed/.openclaw';
  const agentSlug = agentName.toLowerCase().replace(/\s+/g, '-');
  return path.join(workspaceBase, `workspace-${agentSlug}`);
}

function generateWorkingTemplate(): string {
  return `# WORKING.md

## Current Task
No active task

## Status
Idle

## Next Steps
1. Awaiting assignment
`;
}

function generateWorkingContent(agentName: string, task: any): string {
  if (!task) {
    return generateWorkingTemplate();
  }

  return `# WORKING.md

## Current Task
${task.title}

**Assigned:** ${new Date(task.created_at).toLocaleDateString()}  
**Priority:** ${task.priority.toUpperCase()}  
**Status:** ${task.column_status.replace('_', ' ').toUpperCase()}

## Description
${task.description || 'No description provided'}

## Status
${getStatusMessage(task.column_status)}

## Next Steps
${generateNextSteps(task)}

---
*Last updated: ${new Date().toISOString()}*  
*Mission Control Task ID: ${task.id}*
`;
}

function getStatusMessage(status: string): string {
  switch (status) {
    case 'backlog':
      return 'Task awaiting prioritization';
    case 'todo':
      return 'Ready to start';
    case 'in_progress':
      return 'Actively working on this task';
    case 'blocked':
      return '⚠️ BLOCKED - Waiting on dependencies or resolution';
    case 'review':
      return 'Completed, awaiting review';
    case 'done':
      return 'Task completed';
    default:
      return 'Status unknown';
  }
}

function generateNextSteps(task: any): string {
  // Simple heuristic - can be enhanced with AI later
  switch (task.column_status) {
    case 'todo':
      return `1. Review task requirements\n2. Break down into subtasks\n3. Begin implementation`;
    case 'in_progress':
      return `1. Continue implementation\n2. Test as you go\n3. Update status regularly`;
    case 'blocked':
      return `1. Identify what's blocking progress\n2. Document blocker in comments\n3. Notify relevant parties\n4. Work on unblocked tasks meanwhile`;
    case 'review':
      return `1. Ensure all acceptance criteria met\n2. Wait for reviewer feedback\n3. Address any feedback`;
    case 'done':
      return `1. Archive task\n2. Document learnings\n3. Move to next task`;
    default:
      return `1. Clarify task requirements\n2. Get started`;
  }
}
