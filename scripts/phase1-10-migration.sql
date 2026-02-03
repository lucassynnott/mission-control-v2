-- Phase 1 + 10 Migration: Thread Subscriptions & Auto-Notify on Assignment
-- Run this in Supabase SQL Editor

-- 1. Create task_subscriptions table
CREATE TABLE IF NOT EXISTS task_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, agent_id)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_subscriptions_task ON task_subscriptions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_subscriptions_agent ON task_subscriptions(agent_id);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE task_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. Create policy for task_subscriptions (allow all for now)
CREATE POLICY "Allow all operations on task_subscriptions" ON task_subscriptions
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Add delivered field to notifications if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'delivered'
  ) THEN
    ALTER TABLE notifications ADD COLUMN delivered BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 6. Create index on notifications for delivery queries
CREATE INDEX IF NOT EXISTS idx_notifications_undelivered ON notifications(user_id, delivered) WHERE delivered = false;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '- task_subscriptions table created';
  RAISE NOTICE '- Indexes added for performance';
  RAISE NOTICE '- RLS policies configured';
END $$;
