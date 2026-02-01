import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Task = {
  id: string;
  title: string;
  description: string;
  column_status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee: string | null;
  project_tag: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type Agent = {
  id: string;
  name: string;
  role: string;
  model: string;
  status: 'idle' | 'active' | 'blocked';
  session_key: string;
  current_task_id: string | null;
  avatar_emoji: string | null;
  tokens_used: number;
  created_at: string;
  updated_at: string;
};
