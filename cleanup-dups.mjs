import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Keep these (most recent, lowercase)
const keepIds = [
  'c08e91fa-0a6c-450e-b71d-d79a4dcd9442', // claws
  'dd3a9eb1-751f-494e-b4ee-06e179aaaaec', // johnny
  '809d389c-69a1-4a4b-8a6a-a60a90c8419a', // tbug
  '8430e82d-4aec-464f-9172-541462d29f92', // river
  'a2896aca-e44c-460f-a7ac-ee4d2b14357a', // alt
  '2b7bd808-7f45-4ae0-ac2b-d0644200b6a9', // kerry
  'efa3acbc-f1e6-4c0c-9948-88bc392ae0eb', // lizzy
  '5be9a2d0-7e16-4fd7-a5ef-f658c2e61178', // judy
  '2abcdbcc-fafc-4ff0-8b10-d07e6a6472af', // panam
  '1e5e6aa8-be53-4aac-952b-e5c973252c6f', // viktor
  '57060aa1-fc10-4508-a24b-1e8b9a58f546', // misty
];

console.log('Step 1: Delete notifications for duplicate agents...');
const { error: notifError } = await supabase
  .from('notifications')
  .delete()
  .not('user_id', 'in', `(${keepIds.join(',')})`);

if (notifError) console.error('Notification delete error:', notifError);
else console.log('✅ Deleted notifications');

console.log('Step 2: Delete task_subscriptions for duplicate agents...');
const { error: subError } = await supabase
  .from('task_subscriptions')
  .delete()
  .not('agent_id', 'in', `(${keepIds.join(',')})`);

if (subError) console.error('Subscription delete error:', subError);
else console.log('✅ Deleted subscriptions');

console.log('Step 3: Delete duplicate agents...');
const { error: agentError } = await supabase
  .from('agents')
  .delete()
  .not('id', 'in', `(${keepIds.join(',')})`);

if (agentError) console.error('Agent delete error:', agentError);
else console.log('✅ Deleted duplicates');

// Verify
const { data: remaining } = await supabase
  .from('agents')
  .select('id, name, role')
  .order('name');

console.log('\n✅ Remaining agents:', remaining.length);
remaining.forEach(a => console.log(`  ${a.name} | ${a.role}`));
