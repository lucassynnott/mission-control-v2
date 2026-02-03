-- Add agent levels to agents table
-- Levels: intern, specialist, lead

DO $$ 
BEGIN
  -- Add level column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agents' AND column_name = 'level'
  ) THEN
    ALTER TABLE agents 
    ADD COLUMN level TEXT DEFAULT 'specialist' CHECK (level IN ('intern', 'specialist', 'lead'));
    
    RAISE NOTICE 'Added level column to agents table';
  ELSE
    RAISE NOTICE 'Level column already exists';
  END IF;
END $$;

-- Update existing agents to have default level
UPDATE agents SET level = 'specialist' WHERE level IS NULL;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Agent levels migration completed!';
  RAISE NOTICE '- Levels: intern | specialist | lead';
  RAISE NOTICE '- Default: specialist';
END $$;
