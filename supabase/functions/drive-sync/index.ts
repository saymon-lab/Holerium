import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as djwt from "https://deno.land/x/djwt@v2.9/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Manuseio de Preflight (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log("--- INICIANDO ROBÔ DE SINCRONIZAÇÃO ---");
  let totalSynced = 0;
  let errorCount = 0;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const googleJsonStrRaw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT') || '';
    const rootFolderId = Deno.env.get('ROOT_FOLDER_ID') || '1_6thKMpLPSG_3ZPKF0640HDJeFxGyLjr';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Ler o ano do corpo da requisição (se houver)
    let targetYearLimit = null;
    try {
      const payload = await req.json();
      if (payload.year) targetYearLimit = String(payload.year);
    } catch { /* Sem corpo, ignora */ }

    // Decodificação segura da chave do Google
    let googleJsonStr = googleJsonStrRaw;
    if (!googleJsonStr.trim().startsWith('{')) {
      googleJsonStr = atob(googleJsonStr);
    }
    const googleConfig = JSON.parse(googleJsonStr);
    const token = await getGoogleToken(googleConfig);

    // 1. Carregar lista de funcionários para conferência
    const { data: employees, error: empErr } = await supabase.from('employees').select('name, cpf');
    if (empErr) throw new Error(`Erro ao buscar funcionários: ${empErr.message}`);

    // 2. Localizar pastas de competência (Meses e Anos)
    const monthFolders: any[] = [];
    const rootChildren = await listFolders(rootFolderId, token);

    for (const folder of rootChildren) {
      const isYearOnly = folder.name.match(/^20\d{2}$/);
      const isMonth = folder.name.match(/(\d{2})[-/](\d{4})/);
      const isSpecial = folder.name.toUpperCase().includes('FERIAS') || 
                        folder.name.includes('13-') || 
                        folder.name.toUpperCase().includes('DIRF');

      if (isMonth || isSpecial) {
        monthFolders.push(folder);
      } else if (isYearOnly) {
        if (!targetYearLimit || folder.name === targetYearLimit) {
          console.log(`[BOT] Vasculhando ano: ${folder.name}`);
          const subFolders = await listFolders(folder.id, token);
          monthFolders.push(...subFolders);
        }
      }
    }

    console.log(`[BOT] Total de pastas encontradas para análise: ${monthFolders.length}`);

    // 3. Sincronização de Arquivos
    const startTime = Date.now();
    const MAX_TIME = 100000; // 100 segundos

    for (const folder of monthFolders) {
      if (Date.now() - startTime > MAX_TIME) break;

      // Detectar Competência da Pasta
      let category = 'holerite';
      let month = '01';
      let year = new Date().getFullYear().toString();
      
      const folderUpper = folder.name.toUpperCase();
      const match = folder.name.match(/(\d{2})[-/](\d{4})/);
      
      if (match) {
        month = match[1]; year = match[2];
      } else if (folderUpper.includes('FERIAS')) {
        month = '15'; category = 'ferias';
        year = folder.name.match(/\d{4}/)?.[0] || year;
      } else if (folderUpper.includes('13') && (folderUpper.includes('1ª') || folderUpper.includes('1A'))) {
        month = '13'; category = '13_salario_1';
        year = folder.name.match(/\d{4}/)?.[0] || year;
      } else if (folderUpper.includes('13') && (folderUpper.includes('2ª') || folderUpper.includes('2A'))) {
        month = '14'; category = '13_salario_2';
        year = folder.name.match(/\d{4}/)?.[0] || year;
      } else if (folderUpper.includes('DIRF') || folderUpper.includes('RENDIMENTOS')) {
        month = '16'; category = 'rendimentos';
        year = folder.name.match(/\d{4}/)?.[0] || year;
      }

      const files = await listFiles(folder.id, token);
      for (const file of files) {
        if (Date.now() - startTime > MAX_TIME) break;

        const employee = matchEmployee(file.name, employees || []);
        if (!employee) continue;

        const normalizedName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const cloudPath = `${employee.cpf}/${year}/${month}/${normalizedName}`;

        try {
          // Upload para o Storage
          const blob = await downloadFile(file.id, token);
          await supabase.storage.from('receipts').upload(cloudPath, blob, { upsert: true });

          const cleanCpf = employee.cpf.replace(/\D/g, '');
          const formattedCpf = employee.cpf;

          // Registro no Banco de Dados
          const { data: dbEntry } = await supabase
            .from('documents')
            .select('id')
            .eq('year', year)
            .eq('month', month)
            .eq('category', category)
            .or(`owner_cpf.eq."${formattedCpf}",owner_cpf.eq."${cleanCpf}"`)
            .maybeSingle();

          const docData = {
            owner_cpf: formattedCpf,
            year, month, category,
            filename: normalizedName,
            file_path: cloudPath
          };

          if (dbEntry) {
            await supabase.from('documents').update(docData).eq('id', dbEntry.id);
          } else {
            const { error: insErr } = await supabase.from('documents').insert(docData);
            if (insErr) {
               // Tenta CPF limpo se falhar
               docData.owner_cpf = cleanCpf;
               await supabase.from('documents').insert(docData);
            }
          }
          totalSynced++;
        } catch (e) {
          console.error(`[BOT] Erro no arquivo ${file.name}:`, e.message);
          errorCount++;
        }
      }
    }

    return new Response(JSON.stringify({ totalSynced, errorCount }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    });

  } catch (err) {
    console.error("[BOT] Erro Fatal:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500 
    });
  }
});

// --- FUNÇÕES AUXILIARES GOOGLE DRIVE ---

async function getGoogleToken(config: any) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: config.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: config.token_uri,
    exp: now + 3600,
    iat: now,
  };

  // Limpar a PEM key para extrair o conteúdo Base64
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = config.private_key
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");
  
  // Converter Base64 para ArrayBuffer
  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const jwt = await new djwt.Header({ alg: "RS256", typ: "JWT" })
    .setPayload(payload)
    .create(key);

  const resp = await fetch(config.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await resp.json();
  if (data.error) throw new Error(`Google Auth: ${data.error_description}`);
  return data.access_token;
}

async function listFolders(parent: string, token: string) {
  const q = encodeURIComponent(`'${parent}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const resp = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await resp.json();
  return data.files || [];
}

async function listFiles(parent: string, token: string) {
  const q = encodeURIComponent(`'${parent}' in parents and mimeType = 'application/pdf' and trashed = false`);
  const resp = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await resp.json();
  return data.files || [];
}

async function downloadFile(id: string, token: string) {
  const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return await resp.blob();
}

function matchEmployee(fileName: string, employees: any[]) {
  const simplify = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  const fName = simplify(fileName);
  
  return employees.find(e => {
    if (fName.includes(e.cpf.replace(/\D/g, ''))) return true;
    const eName = simplify(e.name);
    const parts = eName.split(' ').filter(p => p.length > 2);
    return parts.length > 0 && parts.every(p => fName.includes(p));
  });
}
