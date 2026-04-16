// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as djwt from "https://deno.land/x/djwt@v2.9/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  console.log("--- SINCRONIZAÇÃO INTELIGENTE v4.0 ---");
  let totalSynced = 0;
  let errorCount = 0;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const googleJsonStrRaw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT') || '';
    const rootFolderId = Deno.env.get('ROOT_FOLDER_ID') || '1_6thKMpLPSG_3ZPKF0640HDJeFxGyLjr';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let googleConfig;
    try {
      let jsonContent = googleJsonStrRaw.trim();
      if (!jsonContent.startsWith('{')) jsonContent = atob(jsonContent);
      googleConfig = JSON.parse(jsonContent);
    } catch {
      throw new Error("Chave Google inválida.");
    }

    const token = await getGoogleToken(googleConfig);

    const { data: employees } = await supabase.from('employees').select('name, cpf');
    
    const monthFolders: any[] = [];
    console.log("[BOT] Mapeando pastas do Drive...");
    const rootChildren = await listFolders(rootFolderId, token);

    for (const folder of rootChildren) {
      const isYear = folder.name.match(/^20\d{2}$/);
      const isFullMonth = folder.name.match(/(\d{2})[-/](\d{4})/);
      const isDIRF = folder.name.match(/(DIRF|RENDIMENTOS)-(\d{4})/i);
      
      if (isDIRF) {
        // Para DIRF, tenta pegar o ano do nome da pasta ou do arquivo depois
        monthFolders.push({ id: folder.id, name: folder.name, month: '16', year: isDIRF[2] });
      } else if (isFullMonth) {
        monthFolders.push({ id: folder.id, name: folder.name, month: isFullMonth[1], year: isFullMonth[2] });
      } else if (isYear) {
        const year = isYear[0];
        const subFolders = await listFolders(folder.id, token);
        for (const sub of subFolders) {
          const mMatch = sub.name.match(/^(\d{2})$/) || sub.name.match(/^(\d{2})[-/]/);
          if (mMatch) {
            monthFolders.push({ id: sub.id, name: sub.name, month: mMatch[1], year: year });
          }
        }
      }
    }

    // Ordenar para processar 2026 primeiro
    monthFolders.sort((a, b) => b.year.localeCompare(a.year) || b.month.localeCompare(a.month));

    console.log(`[BOT] Pastas Candidatas: ${monthFolders.length} (Priorizando mais recentes)`);
    const startTime = Date.now();

    for (const folder of monthFolders) {
      if (Date.now() - startTime > 105000) break;

      const { month, year } = folder;
      let category = 'holerite';
      const folderUpper = folder.name.toUpperCase();
      
      if (folderUpper.includes('FERIAS') || month === '15') {
        category = 'ferias';
      } else if (folderUpper.includes('DIRF') || folderUpper.includes('RENDIMENTOS') || month === '16') {
        category = 'rendimentos';
      } else if (folderUpper.includes('PRIMEIRA') || month === '13') {
        category = '13_salario_1';
      } else if (folderUpper.includes('SEGUNDA') || month === '14') {
        category = '13_salario_2';
      }

      const files = await listFiles(folder.id, token);
      console.log(`[BOT] Pasta ${year}/${month}: ${files.length} arquivos.`);

      for (const file of files) {
        // Proteção contra Timeout: Se faltar menos de 10s para os 2 minutos, para.
        if (Date.now() - startTime > 110000) {
          console.log("[BOT] Limite de tempo atingido. Encerrando ciclo.");
          return new Response(JSON.stringify({ status: "partial", totalSynced }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const employee = matchEmployee(file.name, employees || []);
        if (!employee) continue;

        const normalizedName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const cleanCpf = employee.cpf.replace(/\D/g, '');
        const formattedCpf = employee.cpf;
        
        let fileYear = year;
        if (category === 'rendimentos') {
          const yMatch = file.name.match(/(\d{4})/);
          if (yMatch) fileYear = yMatch[1];
        }

        const cloudPath = `${formattedCpf}/${fileYear}/${month}/${normalizedName}`;

        try {
          console.log(`[PROCESSANDO] ${year}/${month} - ${file.name}`);
          
          // 1. Download do Google Drive
          const blob = await downloadFile(file.id, token);
          
          // 2. Upload para Supabase Storage
          await supabase.storage.from('receipts').upload(cloudPath, blob, { upsert: true });

          // 3. LIMPEZA AGRESSIVA: Remove qualquer registro anterior com o MESMO NOME de arquivo para este usuário
          // Isso corrige casos onde o arquivo foi detectado com ano/mês errado anteriormente.
          await supabase.from('documents').delete().match({ owner_cpf: cleanCpf, filename: normalizedName });
          
          if (cleanCpf !== formattedCpf) {
            await supabase.from('documents').delete().match({ owner_cpf: formattedCpf, filename: normalizedName });
          }

          // 4. INSERÇÃO DO NOVO REGISTRO
          const docData = { owner_cpf: cleanCpf, year: fileYear, month, category, filename: normalizedName, file_path: cloudPath };
          const { error: insErr } = await supabase.from('documents').insert(docData);
          
          if (insErr) {
            console.warn(`    [!] Erro FK, tentando CPF formatado...`);
            docData.owner_cpf = formattedCpf;
            await supabase.from('documents').insert(docData);
          }
          
          totalSynced++;
        } catch (e: any) {
          console.error(`  [!] Erro crítico em ${file.name}:`, e.message);
          errorCount++;
        }
      }
    }

    return new Response(JSON.stringify({ status: "done", totalSynced }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

async function getGoogleToken(config: any) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: config.client_email, scope: "https://www.googleapis.com/auth/drive.readonly", aud: config.token_uri, exp: now + 3600, iat: now };
  const pem = config.private_key.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", binaryDer.buffer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const jwt = await djwt.create({ alg: "RS256", typ: "JWT" }, payload, key);
  const resp = await fetch(config.token_uri, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await resp.json();
  return data.access_token;
}

async function listFolders(parent: string, token: string) {
  const q = encodeURIComponent(`'${parent}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const resp = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await resp.json();
  return data?.files || [];
}

async function listFiles(parent: string, token: string) {
  const q = encodeURIComponent(`'${parent}' in parents and mimeType = 'application/pdf' and trashed = false`);
  const resp = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await resp.json();
  return data?.files || [];
}

async function downloadFile(id: string, token: string) {
  const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
  return await resp.blob();
}

function matchEmployee(fileName: string, employees: any[]) {
  const simplify = (t: string) => 
    t.normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "")
     .toUpperCase()
     .replace(/(.)\1+/g, "$1") // Ignora letras duplicadas (LL -> L, SS -> S, etc)
     .trim();

  const fName = simplify(fileName);
  return employees.find(e => {
    if (fName.includes(e.cpf.replace(/\D/g, ''))) return true;
    const eName = simplify(e.name);
    const parts = eName.split(' ').filter(p => p.length > 2);
    return parts.length > 0 && parts.every(p => fName.includes(p));
  });
}
