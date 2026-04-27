import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: Credenciais do Supabase não encontradas no arquivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = ['employees', 'documents', 'access_logs'];
const date = new Date().toISOString().split('T')[0];
const backupDir = path.join(process.cwd(), 'backups');

async function runBackup() {
  console.log(`Iniciando backup em: ${backupDir}...`);

  for (const table of tables) {
    console.log(`Exportando tabela: ${table}...`);
    const { data, error } = await supabase.from(table).select('*');

    if (error) {
      console.error(`Erro ao exportar ${table}:`, error.message);
      continue;
    }

    const fileName = `backup_${table}_${date}.json`;
    const filePath = path.join(backupDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Sucesso: ${fileName} gerado (${data.length} registros).`);
  }

  console.log('--- Backup concluído com sucesso! ---');
}

runBackup();
