import { config } from 'dotenv';
config({ path: '.env.local' });

import { supabase } from './lib/supabase.js';

const {data: agents} = await supabase.from('agents').select('id, name');
console.log('Agents:', agents);

const {data: tasks} = await supabase.from('tasks').select('id, title, assignee, column_status').eq('assignee', 'Johnny').limit(3);
console.log('\nTasks assigned to "Johnny":', tasks);
