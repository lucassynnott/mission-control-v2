import { supabase } from './lib/supabase.js';

const { data: agents } = await supabase.from('agents').select('id, name');
console.log('Agents:', JSON.stringify(agents, null, 2));

const { data: tasks } = await supabase.from('tasks').select('id, title, assignee, column_status').eq('column_status', 'in_progress');
console.log('\nTasks in progress:', JSON.stringify(tasks, null, 2));
