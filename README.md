# 🛡️ Holerium - Portal de Automação de Holerites

O **Holerium** é um ecossistema digital de alta performance projetado para automatizar a gestão, sincronização e entrega de holerites e informes de rendimentos. Utilizando uma arquitetura *Cloud-Native*, o portal conecta o Google Drive do RH diretamente ao colaborador de forma segura, rápida e intuitiva.

---

## 🚀 Principais Funcionalidades

- **Sincronização Atômica (Bot)**: Robô autônomo que monitora o Google Drive e espelha documentos para o Supabase Storage a cada 5 minutos.
- **Categorização Inteligente**: Detecção automática de tipos de documentos:
  - `01 a 12`: Holerites Mensais.
  - `13 e 14`: 13º Salário (1ª e 2ª parcelas).
  - `15`: Recibos de Férias.
  - `16`: Informes de Rendimentos (DIRF).
- **Acesso Biométrico (WebAuthn)**: Login instantâneo via Digital ou Reconhecimento Facial.
- **Segurança LGPD**: Arquivos armazenados em buckets privados com acesso restrito via tokens de autenticação.
- **Dashboard Administrativo**: Console completo para gestão de colaboradores, sincronização em lote e auditoria de logs.

---

## 🛠️ Arquitetura Técnica

- **Frontend**: React.js + Vite (Mobile-First & Glassmorphism UI).
- **Backend/Backend-as-a-Service**: Supabase (PostgreSQL + Auth + Storage).
- **Automação (Bot)**: Supabase Edge Functions (Deno Runtime) + Google Drive API v3.
- **Animações**: Motion (Framer Motion) para micro-interações fluidas.

---

## ⚙️ Configuração do Ambiente (Desenvolvedor)

### Pré-requisitos
- Node.js (v18+)
- Conta no Supabase
- Google Cloud Service Account (para o Robô de Sincronia)

### Instalação
1. Clone o repositório.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure as variáveis de ambiente no arquivo `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Inicie o ambiente de desenvolvimento:
   ```bash
   npm run dev
   ```

---

## 🤖 Guia de Operação do RH

Para o correto funcionamento do robô, a estrutura no Google Drive deve seguir o padrão:
`Pasta Raiz > [Ano] > [Mes/Categoria] > [CPF_DO_COLABORADOR].pdf`

**Regras de Nome de Pastas:**
- `01` a `12`: Holerites.
- `DIRF` ou `RENDIMENTOS`: Informes anuais.
- `FERIAS`: Recibos de férias.
- `13`: 13º Salário.

---

## 🛡️ Segurança e Compliance

O Holerium foi desenvolvido seguindo as melhores práticas da **LGPD (Lei Geral de Proteção de Dados)**:
- **Isolamento de Dados**: Cada colaborador só visualiza documentos vinculados ao seu CPF.
- **Criptografia**: Credenciais e documentos são protegidos em trânsito e em repouso.
- **Pista de Auditoria**: Logs de sincronização permitem rastrear quando cada documento foi processado.

---

<div align="center">
  <p>Desenvolvido com foco em Eficiência Operacional e Experiência do Usuário.</p>
  <b>Portal © 2026</b>
</div>
