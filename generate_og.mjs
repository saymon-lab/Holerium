import sharp from 'sharp';
import fs from 'fs';

const svgBuffer = Buffer.from(`
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Fundo Escuro Metálico (SaaS Moderno) -->
  <rect width="1200" height="630" fill="#0f172a"/>
  
  <!-- Ícone H Azul Centralizado -->
  <!-- O ícone original era 64x64, multiplicamos por 3 (192x192) -->
  <g transform="translate(504, 180)">
    <rect width="192" height="192" rx="48" fill="url(#grad)"/>
    <path d="M60 60V132M132 60V132M60 96H132" stroke="white" stroke-width="12" stroke-linecap="round"/>
  </g>
  
  <!-- Texto Central -->
  <text x="600" y="460" font-family="system-ui, -apple-system, sans-serif" font-size="56" font-weight="bold" fill="white" text-anchor="middle">Central de Documentos</text>
  <text x="600" y="520" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="500" fill="#94a3b8" text-anchor="middle">Portal do Colaborador</text>

  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="192" y2="192">
      <stop offset="0%" stop-color="#0B1F5B"/>
      <stop offset="100%" stop-color="#2563EB"/>
    </linearGradient>
  </defs>
</svg>
`);

sharp(svgBuffer)
  .png()
  .toFile('./public/og-image.png')
  .then(() => console.log('OG image created successfully!'))
  .catch(err => console.error('Error generating OG image:', err));
