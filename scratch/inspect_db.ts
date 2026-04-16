
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Environment variables VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY are missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraints() {
  console.log('Checking constraints and indexes for table "documents"...');
  
  // Query to get unique constraints and unique indexes
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'documents' });

  if (error) {
    // If RPC doesn't exist, try a raw SQL query via a dummy select if possible, 
    // or just try to broad-drop in the next step.
    console.log('RPC get_table_info not found. Falling back to broad cleaning strategy.');
    return;
  }

  console.log('Constraints/Indexes found:', data);
}

checkConstraints();
