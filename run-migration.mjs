import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const sql = readFileSync('./sql/003_agent_levels.sql', 'utf-8');

console.log('Running migration: 003_agent_levels.sql');
console.log('---');

// Execute via RPC - Supabase doesn't expose raw SQL via client
// We'll need to use the REST API directly
const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
  },
  body: JSON.stringify({ query: sql })
});

if (!response.ok) {
  console.error('Migration failed:', await response.text());
  console.log('\n⚠️  Manual step required:');
  console.log('1. Go to https://ffbycicylvueaopumwaf.supabase.co/project/_/sql');
  console.log('2. Paste the contents of sql/003_agent_levels.sql');
  console.log('3. Click "Run"');
} else {
  console.log('✅ Migration completed successfully!');
}
