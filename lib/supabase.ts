import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDg2NjQ1NTksImV4cCI6MTk2NDI0MDU1OX0.placeholder';

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
