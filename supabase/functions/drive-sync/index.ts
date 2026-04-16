import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as djwt from "https://deno.land/x/djwt@v2.9/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  console.log("--- INICIANDO ROBÔ (v2.6.0) ---");
  let totalSynced = 0;
  let errorCount = 0;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const googleJsonStrRaw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT') || '';
    const rootFolderId = Deno.env.get('ROOT_FOLDER_ID') || '1_6thKMpLPSG_3ZPKF0640HDJeFxGyLjr';

    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Configuração do Supabase (URL/KEY) ausente.");
    if (!googleJsonStrRaw) throw new Error("Configuração do Google Service Account ausente.");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Decodificação segura da chave do Google
    let googleJsonStr = googleJsonStrRaw.trim();
    if (!googleJsonStr.startsWith('{')) {
      try { googleJsonStr = atob(googleJsonStr); } catch { throw new Error("Falha ao decodificar BASE64 da chave Google."); }
    }
    
    const googleConfig = JSON.parse(googleJsonStr);
    console.log("[BOT] Autenticando com Google...");
    const token = await getGoogleToken(googleConfig);

    console.log("[BOT] Carregando funcionários...");
    const { data: employees, error: empErr } = await supabase.from('employees').select('name, cpf');
    if (empErr) throw new Error(`Erro DB Funcionários: ${empErr.message}`);

    const monthFolders: any[] = [];
    const rootChildren = await listFolders(rootFolderId, token);

    for (const folder of rootChildren) {
      const isYear = folder.name.match(/^20\d{2}$/);
      const isMonth = folder.name.match(/(\d{2})[-/](\d{4})/);
      if (isMonth) {
        monthFolders.push(folder);
      } else if (isYear) {
        console.log(`[BOT] Vasculhando ano: ${folder.name}`);
        const subFolders = await listFolders(folder.id, token);
        monthFolders.push(...subFolders);
      }
    }

    console.log(`[BOT] Pastas encontradas: ${monthFolders.length}`);
    const startTime = Date.now();

    for (const folder of monthFolders) {
      if (Date.now() - startTime > 110000) break;

      let month = '01', year = '2026', category = 'holerite';
      const match = folder.name.match(/(\d{2})[-/](\d{4})/);
      if (match) { month = match[1]; year = match[2]; }
      const folderUpper = folder.name.toUpperCase();
      if (folderUpper.includes('FERIAS')) category = 'ferias';
      else if (folderUpper.includes('DIRF') || folderUpper.includes('RENDIMENTOS')) category = 'rendimentos';

      const files = await listFiles(folder.id, token);
      for (const file of files) {
        const employee = matchEmployee(file.name, employees || []);
        if (!employee) continue;

        const normalizedName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const cloudPath = `${employee.cpf}/${year}/${month}/${normalizedName}`;

        try {
          const blob = await downloadFile(file.id, token);
          const { error: stoErr } = await supabase.storage.from('receipts').upload(cloudPath, blob, { upsert: true });
          if (stoErr && stoErr.message !== 'The resource already exists') throw stoErr;

          const cleanCpf = employee.cpf.replace(/\D/g, '');
          const formattedCpf = employee.cpf;

          // Registro no Banco de Dados com Segurança Máxima
          try {
            // TESTE DEFINITIVO: Priorizar o CPF LIMPO (só números) que funcionou para Jan/Fev/Mar 2026
            const targetCpf = cleanCpf; 

            const { data: existing, error: findErr } = await supabase.from('documents')
              .select('id').eq('year', year).eq('month', month).eq('category', category)
              .or(`owner_cpf.eq."${cleanCpf}",owner_cpf.eq."${formattedCpf}"`)
              .maybeSingle();

            if (findErr) throw findErr;

            const docData = { 
              owner_cpf: targetCpf, 
              year, month, category, 
              filename: normalizedName, 
              file_path: cloudPath 
            };

            if (existing && existing.id) {
              const { error: updErr } = await supabase.from('documents').update(docData).eq('id', existing.id);
              if (updErr) throw updErr;
              totalSynced++;
              console.log(`  [ATUALIZADO] ${employee.name} (${month}/${year})`);
            } else {
              // Tenta inserir primeiro com o CPF limpo
              const { error: insErr } = await supabase.from('documents').insert(docData);
              
              if (insErr) {
                // Plano B: Tenta com CPF formatado se o limpo falhar
                console.warn(`  [!] Falha com CPF limpo, tentando formatado para ${employee.name}...`);
                docData.owner_cpf = formattedCpf;
                const { error: insErr2 } = await supabase.from('documents').insert(docData);
                if (insErr2) throw insErr2;
              }
              
              totalSynced++;
              console.log(`  [INSERIDO] ${employee.name} (${month}/${year})`);
            }
          } catch (dbEx: any) {
            console.error(`  [!] Falha no banco para ${employee.name}:`, dbEx.message);
            errorCount++;
          }
        } catch (e: any) {
          console.error(`[!] Erro no arquivo ${file.name}:`, e.message);
          errorCount++;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, totalSynced, errorCount }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error("[ERRO FATAL]", err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 200, // Retornar 200 para o console mostrar o erro no corpo
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function getGoogleToken(config: any) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: config.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: config.token_uri,
    exp: now + 3600,
    iat: now,
  };

  const pemContents = config.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  
  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const key = await crypto.subtle.importKey(
    "pkcs8", binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  const jwt = await djwt.create({ alg: "RS256", typ: "JWT" }, payload, key);

  const resp = await fetch(config.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await resp.json();
  if (!data || data.error) throw new Error(`Google Auth: ${data?.error_description || 'Resposta vazia'}`);
  return data.access_token;
}

async function listFolders(parent: string, token: string) {
  const q = encodeURIComponent(`'${parent}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const resp = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await resp.json();
  return data?.files || [];
}

async function listFiles(parent: string, token: string) {
  const q = encodeURIComponent(`'${parent}' in parents and mimeType = 'application/pdf' and trashed = false`);
  const resp = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await resp.json();
  return data?.files || [];
}

async function downloadFile(id: string, token: string) {
  const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!resp.ok) throw new Error(`Download Google falhou: ${resp.status}`);
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
