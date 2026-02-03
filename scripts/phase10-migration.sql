-- Phase 10 Migration: Documents & Skills
-- Run this in Supabase SQL Editor

-- 1. Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deliverable', 'research', 'protocol', 'notes')),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add skills column to agents table
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';

-- 3. Add required_skills column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS required_skills TEXT[] DEFAULT '{}';

-- 4. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_documents_task_id ON documents(task_id);
CREATE INDEX IF NOT EXISTS idx_agents_skills ON agents USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_tasks_required_skills ON tasks USING GIN(required_skills);

-- 5. Enable RLS (Row Level Security)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 6. Create policy for documents (allow all for now)
CREATE POLICY "Allow all operations on documents" ON documents
  FOR ALL USING (true) WITH CHECK (true);

-- 7. Add trigger to update updated_at on documents
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
