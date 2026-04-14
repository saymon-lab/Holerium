import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// CONFIGURAÇÃO
// Coloque o caminho da sua pasta de recibos aqui entre as aspas
const PASTA_ORIGEM = 'C:/Users/operacional/Documents/ENVIO RECIBOS'; 
const PASTA_DESTINO = './recibos_comprimidos';

async function compressPDF(filePath, outPath) {
  try {
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // O pdf-lib por padrão já aplica compressão de streams ao salvar
    // Isso remove metadados desnecessários e otimiza a estrutura interna
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addMetadata: false,
    });

    fs.writeFileSync(outPath, compressedBytes);
    const oldSize = (pdfBytes.length / 1024).toFixed(2);
    const newSize = (compressedBytes.length / 1024).toFixed(2);
    const ratio = ((1 - compressedBytes.length / pdfBytes.length) * 100).toFixed(1);
    
    console.log(`✅ ${path.basename(filePath)}: ${oldSize}KB -> ${newSize}KB (-${ratio}%)`);
  } catch (err) {
    console.error(`❌ Erro em ${path.basename(filePath)}:`, err.message);
  }
}

function collectPDFFiles(dir, origin) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectPDFFiles(fullPath, origin));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
      const relativePath = path.relative(origin, fullPath);
      files.push({ fullPath, relativePath });
    }
  }
  return files;
}

async function run() {
  console.log('--- INICIANDO COMPRESSÃO DE DOCUMENTOS ---');
  
  if (!fs.existsSync(PASTA_ORIGEM)) {
    console.error(`ERRO: A pasta de origem não existe: ${PASTA_ORIGEM}`);
    console.info('DICA: Abra o arquivo "scripts/comprimir.mjs" e altere a variável PASTA_ORIGEM.');
    return;
  }

  if (!fs.existsSync(PASTA_DESTINO)) fs.mkdirSync(PASTA_DESTINO, { recursive: true });

  const files = collectPDFFiles(PASTA_ORIGEM, PASTA_ORIGEM);
  console.log(`Total de arquivos encontrados: ${files.length}`);

  for (const { fullPath, relativePath } of files) {
    const outputPath = path.join(PASTA_DESTINO, relativePath);
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    await compressPDF(fullPath, outputPath);
  }

  console.log('--- PROCESSO CONCLUÍDO ---');
  console.log(`Os arquivos otimizados estão em: ${path.resolve(PASTA_DESTINO)}`);
}

run();
