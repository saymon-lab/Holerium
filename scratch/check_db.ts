import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDocs() {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .limit(50);

  if (error) {
    console.error('Error fetching documents:', error);
    return;
  }

  console.log('Last 50 documents:');
  data.forEach(doc => {
    console.log(`- ${doc.filename}: CPF=${doc.owner_cpf}, Year=${doc.year}, Month=${doc.month}, Category=${doc.category}`);
  });

  const { data: rendimentos, error: rError } = await supabase
    .from('documents')
    .select('*')
    .eq('month', '16');

  console.log('\nDocuments with month=16:');
  rendimentos?.forEach(doc => {
    console.log(`- ${doc.filename}: CPF=${doc.owner_cpf}, Year=${doc.year}`);
  });
}

checkDocs();
