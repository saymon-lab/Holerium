import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as djwt from "https://deno.land/x/djwt@v2.9/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  console.log("--- INICIANDO SINCRONIZAÇÃO v3.0 ---");
  let totalSynced = 0;
  let errorCount = 0;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const googleJsonStrRaw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT') || '';
    const rootFolderId = Deno.env.get('ROOT_FOLDER_ID') || '1_6thKMpLPSG_3ZPKF0640HDJeFxGyLjr';

    if (!supabaseUrl || !supabaseServiceKey) throw new Error("SUPABASE_URL ou KEY ausente.");
    if (!googleJsonStrRaw) throw new Error("GOOGLE_SERVICE_ACCOUNT ausente.");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let googleConfig;
    try {
      let jsonContent = googleJsonStrRaw.trim();
      if (!jsonContent.startsWith('{')) jsonContent = atob(jsonContent);
      googleConfig = JSON.parse(jsonContent);
    } catch {
      throw new Error("Falha ao processar chave do Google JSON.");
    }

    console.log("[BOT] Autenticando com Google Drive...");
    const token = await getGoogleToken(googleConfig);

    console.log("[BOT] Buscando funcionários no banco...");
    const { data: employees, error: empErr } = await supabase.from('employees').select('name, cpf');
    if (empErr) throw new Error(`Erro ao listar funcionários: ${empErr.message}`);

    const monthFolders: any[] = [];
    console.log("[BOT] Mapeando pastas no Drive...");
    const rootChildren = await listFolders(rootFolderId, token);

    for (const folder of rootChildren) {
      const isYear = folder.name.match(/^20\d{2}$/);
      const isMonth = folder.name.match(/(\d{2})[-/](\d{4})/);
      if (isMonth) {
        monthFolders.push(folder);
      } else if (isYear) {
        const subFolders = await listFolders(folder.id, token);
        monthFolders.push(...subFolders);
      }
    }

    console.log(`[BOT] Pastas Candidatas: ${monthFolders.length}`);
    const startTime = Date.now();

    for (const folder of monthFolders) {
      if (Date.now() - startTime > 105000) {
        console.log("[BOT] Limite de tempo próximo. Encerrando ciclo.");
        break;
      }

      let month = '01', year = '2026', category = 'holerite';
      const folderMatch = folder.name.match(/(\d{2})[-/](\d{4})/);
      if (folderMatch) {
         month = folderMatch[1];
         year = folderMatch[2];
      }
      
      const folderUpper = folder.name.toUpperCase();
      if (folderUpper.includes('FERIAS')) category = 'ferias';
      else if (folderUpper.includes('DIRF') || folderUpper.includes('RENDIMENTOS')) category = 'rendimentos';

      const files = await listFiles(folder.id, token);
      for (const file of files) {
        const employee = matchEmployee(file.name, employees || []);
        if (!employee) continue;

        const normalizedName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const cleanCpf = employee.cpf.replace(/\D/g, '');
        const formattedCpf = employee.cpf;
        const cloudPath = `${formattedCpf}/${year}/${month}/${normalizedName}`;

        try {
          console.log(`[PROCESSANDO] ${file.name} -> ${employee.name}`);
          const blob = await downloadFile(file.id, token);
          const { error: stoErr } = await supabase.storage.from('receipts').upload(cloudPath, blob, { upsert: true });
          if (stoErr && stoErr.message !== 'The resource already exists') throw stoErr;

          // Registro no Banco com Retry de Formato (Clean vs Formatted)
          const docData = { 
            owner_cpf: cleanCpf, // Começa tentando limpar (Jan/Fev/Mar 2026 padrão)
            year, month, category, 
            filename: normalizedName, 
            file_path: cloudPath 
          };

          const { data: existing } = await supabase.from('documents')
            .select('id')
            .eq('year', year).eq('month', month).eq('category', category)
            .or(`owner_cpf.eq."${cleanCpf}",owner_cpf.eq."${formattedCpf}"`)
            .maybeSingle();

          if (existing?.id) {
            await supabase.from('documents').update(docData).eq('id', existing.id);
            console.log(`  [OK] Registro atualizado para ${employee.name}`);
          } else {
            const { error: insErr } = await supabase.from('documents').insert(docData);
            if (insErr) {
              // Failback para CPF formatado (Regras de FK antigas)
              docData.owner_cpf = formattedCpf;
              const { error: insErr2 } = await supabase.from('documents').insert(docData);
              if (insErr2) throw new Error(`Falha no vínculo (FK): ${insErr2.message}`);
            }
            console.log(`  [OK] Novo registro criado para ${employee.name}`);
          }
          
          totalSynced++;
        } catch (e: any) {
          console.error(`  [!] Erro no arquivo ${file.name}:`, e?.message || 'Erro Desconhecido');
          errorCount++;
        }
      }
    }

    return new Response(JSON.stringify({ status: "success", totalSynced, errorCount }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    const errorMsg = err?.message || 'Erro inesperado na execução';
    console.error("[ERRO CRÍTICO]", errorMsg);
    return new Response(JSON.stringify({ status: "error", message: errorMsg }), { 
      status: 200, 
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

  const pem = config.private_key.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pem), c => c.charCodeAt(0));

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
  if (!data || data.error) throw new Error(data?.error_description || "Erro de login no Google");
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
  if (!resp.ok) throw new Error("Falha no download");
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
