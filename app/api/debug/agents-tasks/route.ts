import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data: agents } = await supabase.from('agents').select('id, name');
  const { data: allTasks } = await supabase.from('tasks').select('id, title, assignee, column_status').order('created_at', { ascending: false }).limit(5);
  const { data: johnnyTasks } = await supabase.from('tasks').select('id, title, assignee, column_status').eq('assignee', 'Johnny');
  
  return NextResponse.json({ agents, latest_tasks: allTasks, johnny_tasks: johnnyTasks });
}
