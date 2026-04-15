import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as djwt from "https://deno.land/x/djwt@v2.9/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log("--- START SYNC BOT ---");
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    let googleJsonStrRaw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT') || '';
    const rootFolderId = Deno.env.get('ROOT_FOLDER_ID') || '1_6thKMpLPSG_3ZPKF0640HDJeFxGyLjr';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Ler o ano do corpo da requisição (se houver)
    let targetYearLimit = null;
    try {
      const payload = await req.json();
      if (payload.year) targetYearLimit = String(payload.year);
    } catch { /* Sem corpo, ignora */ }

    // Decodificação segura
    let googleJsonStr = googleJsonStrRaw;
    if (!googleJsonStr.trim().startsWith('{')) {
      googleJsonStr = atob(googleJsonStr);
    }
    const googleConfig = JSON.parse(googleJsonStr);
    const token = await getGoogleToken(googleConfig);

    // 1. Otimizar carregamento de funcionários
    const { data: employees, error: empErr } = await supabase.from('employees').select('name, cpf');
    if (empErr) throw new Error(`DB Error: ${empErr.message}`);

    // 2. Busca de Pastas Inteligente
    const monthFolders: any[] = [];
    const rootChildren = await listFolders(rootFolderId, token);

    for (const folder of rootChildren) {
      const isMonth = folder.name.match(/(\d{2})[-/](\d{4})/);
      const isYearOnly = folder.name.match(/^20\d{2}$/);

      if (isMonth) {
        if (!targetYearLimit || folder.name.includes(targetYearLimit)) {
          monthFolders.push(folder);
        }
      } else if (isYearOnly) {
        // Se estamos filtrando por ano e este não é o ano, pula o mergulho
        if (targetYearLimit && folder.name !== targetYearLimit) continue;
        
        console.log(`Diving into year folder: ${folder.name}`);
        const subFolders = await listFolders(folder.id, token);
        for (const sub of subFolders) {
          const isMonthSub = sub.name.match(/(\d{2})[-/](\d{4})/);
          const isSpecial = sub.name.toUpperCase().includes('FERIAS') || sub.name.includes('13-');
          if (isMonthSub || isSpecial) {
            monthFolders.push(sub);
          }
        }
      }
    }

    console.log(`Found ${monthFolders.length} target folders.`);

    // 3. Sincronização em Lote (Evitar Timeouts)
    let totalSynced = 0;
    const startTime = Date.now();
    const MAX_EXECUTION_TIME = 100000; // 100 segundos (limite seguro antes dos 2min da Supabase)

    for (const folder of monthFolders) {
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.log("Limite de tempo atingido. Encerrando lote mais cedo para salvar progresso.");
        break;
      }

      let month = "00";
      let year = "0000";
      const match = folder.name.match(/(\d{2})[-/](\d{4})/);
      if (match) {
        month = match[1];
        year = match[2];
      } else {
        year = folder.name.match(/\d{4}/)?.[0] || targetYearLimit || new Date().getFullYear().toString();
        month = folder.name.toUpperCase().includes('FERIAS') ? '14' : '13';
      }

      console.log(`Sincronizando: ${folder.name}`);
      const files = await listFiles(folder.id, token);
      
      for (const file of files) {
        if (Date.now() - startTime > MAX_EXECUTION_TIME) break;

        const employee = matchEmployee(file.name, employees || []);
        if (!employee) continue;

        const normalizedName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const cloudPath = `${employee.cpf}/${year}/${month}/${normalizedName}`;

        // Verifica duplicata no banco (rápido) antes de baixar (lento)
        const { data: existing } = await supabase.from('documents').select('id').eq('file_path', cloudPath).maybeSingle();
        if (existing) continue;

        try {
          const blob = await downloadFile(file.id, token);
          const { error: storageErr } = await supabase.storage.from('receipts').upload(cloudPath, blob, { upsert: true });
          if (storageErr) throw storageErr;

          await supabase.from('documents').upsert({
            owner_cpf: employee.cpf,
            year,
            month,
            filename: normalizedName,
            file_path: cloudPath
          });

          totalSynced++;
          console.log(`  [OK] ${employee.name}`);
        } catch (e: any) {
          console.error(`  [!] ${file.name}: ${e.message}`);
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      synced: totalSynced, 
      status: totalSynced > 0 ? "Mais arquivos podem estar pendentes devido ao limite de tempo. Execute novamente para continuar." : "Tudo atualizado."
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (err: any) {
    console.error("CRITICAL ERROR:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  }
})

async function getGoogleToken(config: any) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: config.client_email,
    sub: config.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/drive.readonly"
  };
  const keyStr = config.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s|\n/g, "");
  const key = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(keyStr), c => c.charCodeAt(0)), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const jwt = await djwt.create(header, payload, key);
  const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) });
  const data = await res.json();
  if (!data?.access_token) throw new Error(data?.error_description || "Auth Failed");
  return data.access_token;
}

async function listFolders(rootId: string, token: string) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q='${rootId}'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)&pageSize=1000&access_token=${token}`);
  const data = await res.json();
  return data.files || [];
}

async function listFiles(folderId: string, token: string) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType='application/pdf'+and+trashed=false&fields=files(id,name)&pageSize=1000&access_token=${token}`);
  const data = await res.json();
  return data.files || [];
}

async function downloadFile(id: string, token: string) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);
  return await res.blob();
}

function matchEmployee(fileName: string, employees: any[]) {
  const simplify = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  const fName = simplify(fileName);
  const fCpf = fileName.replace(/\D/g, '');
  return employees.find(e => {
    const eCpf = (e.cpf || '').replace(/\D/g, '');
    const eName = simplify(e.name);
    if (fCpf.includes(eCpf) && eCpf.length >= 11) return true;
    const parts = fName.replace(/\.PDF$/, '').split(/[\s._-]+/).filter(p => p.length > 2);
    return parts.length > 0 && parts.every(p => eName.includes(p));
  });
}
