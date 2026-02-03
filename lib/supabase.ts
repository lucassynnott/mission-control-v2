import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Task = {
  id: string;
  title: string;
  description: string;
  column_status: 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee: string | null;
  project_tag: string;
  position: number;
  due_date: string | null;
  required_skills?: string[];
  created_at: string;
  updated_at: string;
};

export type Agent = {
  id: string;
  name: string;
  role: string;
  model: string;
  status: 'idle' | 'active' | 'blocked';
  level: 'intern' | 'specialist' | 'lead';
  session_key: string;
  current_task_id: string | null;
  avatar_emoji: string | null;
  tokens_used: number;
  skills?: string[];
  created_at: string;
  updated_at: string;
};

export type Document = {
  id: string;
  title: string;
  content: string;
  type: 'deliverable' | 'research' | 'protocol' | 'notes';
  task_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: 'mention' | 'task_assigned' | 'task_completed' | 'system';
  title: string;
  message: string;
  read: boolean;
  metadata: {
    task_id?: string;
    task_title?: string;
    mentioned_by?: string;
    link?: string;
  } | null;
  created_at: string;
  updated_at: string;
};
