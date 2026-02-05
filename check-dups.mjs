import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const { data, error } = await supabase
  .from('agents')
  .select('id, name, role, created_at')
  .order('name');

if (error) {
  console.error('Error:', error);
} else {
  console.log('Total agents:', data.length);
  const names = {};
  data.forEach(a => {
    if (!names[a.name]) names[a.name] = 0;
    names[a.name]++;
    console.log(`${a.id} | ${a.name} | ${a.role} | ${a.created_at}`);
  });
  console.log('\nDuplicates:');
  Object.entries(names).forEach(([name, count]) => {
    if (count > 1) console.log(`  ${name}: ${count}x`);
  });
}
