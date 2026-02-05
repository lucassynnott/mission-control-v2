-- Add unique constraint on agent name (case-insensitive)
-- Prevents duplicate agent registrations

-- Create a unique index on lowercase agent name
CREATE UNIQUE INDEX agents_name_lower_unique ON agents (LOWER(name));
