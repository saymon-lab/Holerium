import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  Maximize,
  Bookmark,
  ShieldCheck,
  TrendingUp,
  Share2,
  ExternalLink,
  MessageSquare,
  Folder,
  FileText,
  Lock,
  CloudLightning
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';
import { supabase } from '@/src/lib/supabase';

export default function DocumentViewer() {
  const navigate = useNavigate();

  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser') || '{}');
    } catch { return {}; }
  });

  const [viewState, setViewState] = useState<'years' | 'months' | 'document'>(() => {
    return (sessionStorage.getItem('doc_viewState') as any) || 'years';
  });
  const [selectedYear, setSelectedYear] = useState<string | null>(() => {
    return sessionStorage.getItem('doc_selectedYear');
  });
  const [selectedMonth, setSelectedMonth] = useState<string | null>(() => {
    return sessionStorage.getItem('doc_selectedMonth');
  });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setDocError] = useState<string | null>(null);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [cloudDocuments, setCloudDocuments] = useState<any[]>([]);

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const [years, setYears] = useState<string[]>([]);

  const userName = currentUser.name || "Usuário não identificado";
  const userCpf = currentUser.cpf || "000.000.000-00";

  // 1. Carregar dados da nuvem ao iniciar
  useEffect(() => {
    if (userCpf) loadCloudData();
  }, [userCpf]);

  const loadCloudData = async () => {
    try {
      setLoading(true);
      // Limpa o CPF para a busca (garante que case mesmo com formatos diferentes)
      const cleanSearchCpf = userCpf.replace(/\D/g, '');
      
      const { data: documentsData, error: dbErr } = await supabase
        .from('documents')
        .select('*')
        .or(`owner_cpf.eq."${userCpf}",owner_cpf.eq."${cleanSearchCpf}"`);

      if (dbErr) throw dbErr;

      console.log('Documentos encontrados:', documentsData);
      setCloudDocuments(documentsData || []);

      // Extrair anos únicos
      const foundYears = new Set<string>();
      documentsData?.forEach(doc => foundYears.add(doc.year));
      const sortedYears = Array.from(foundYears).sort((a, b) => b.localeCompare(a));
      setYears(sortedYears);

    } catch (err) {
      console.error('Erro ao buscar documentos na nuvem:', err);
      setDocError('Falha ao conectar com o servidor de documentos.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Persistir estado de navegação
  useEffect(() => {
    sessionStorage.setItem('doc_viewState', viewState);
    if (selectedYear) sessionStorage.setItem('doc_selectedYear', selectedYear);
    else sessionStorage.removeItem('doc_selectedYear');

    if (selectedMonth) sessionStorage.setItem('doc_selectedMonth', selectedMonth);
    else sessionStorage.removeItem('doc_selectedMonth');
  }, [viewState, selectedYear, selectedMonth]);

  // 3. Atualizar meses disponíveis quando o ano for trocado ou os documentos carregarem
  useEffect(() => {
    if (viewState === 'months' && selectedYear && cloudDocuments.length > 0) {
      const monthsInYear = cloudDocuments
        .filter(doc => String(doc.year) === String(selectedYear))
        .map(doc => {
          const mIndex = parseInt(doc.month) - 1;
          return months[mIndex];
        })
        .filter(Boolean);

      console.log('Meses disponíveis em ' + selectedYear + ':', monthsInYear);
      setAvailableMonths(Array.from(new Set(monthsInYear)));
    }
  }, [viewState, selectedYear, cloudDocuments]);

  // 4. Carregar o PDF quando chegar no estado 'document'
  useEffect(() => {
    if (viewState === 'document' && selectedYear && selectedMonth) {
      loadRealPDF();
    } else {
      setPdfUrl(null);
    }
  }, [viewState, selectedYear, selectedMonth, cloudDocuments]);

  const loadRealPDF = async () => {
    setLoading(true);
    setDocError(null);
    try {
      const monthNum = (months.indexOf(selectedMonth!) + 1).toString().padStart(2, '0');
      const doc = cloudDocuments.find(d => String(d.year) === String(selectedYear) && String(d.month) === String(monthNum));

      if (!doc) throw new Error('Documento não encontrado na sua conta. Entre em contato com o RH.');

      const { data, error: storageErr } = await supabase.storage
        .from('receipts')
        .createSignedUrl(doc.file_path, 3600);

      if (storageErr) throw storageErr;
      setPdfUrl(data.signedUrl);

    } catch (err: any) {
      setDocError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderYears = () => (
    <div className="animate-fade-in space-y-8">
      <div className="flex items-center gap-5 mb-10">
        <button
          onClick={() => navigate('/dashboard')}
          className="w-14 h-14 flex items-center justify-center rounded-full bg-white hover:bg-surface-container transition-colors text-primary shadow-sm active:scale-95 border border-surface-container-high"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="space-y-2">
          <h2 className="text-4xl md:text-5xl font-extrabold font-headline text-on-surface tracking-tight">Meus Documentos</h2>
          <p className="text-secondary font-body max-w-2xl text-lg">Acesse seus comprovantes de pagamento sincronizados na nuvem.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {years.length > 0 ? years.map(year => (
          <motion.button
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.98 }}
            key={year}
            onClick={() => { setSelectedYear(year); setViewState('months'); }}
            className="bg-white p-8 rounded-3xl border border-surface-container-high shadow-sm hover:shadow-xl hover:border-primary/30 transition-all flex flex-col items-center justify-center gap-4 group h-56"
          >
            <Folder className="w-20 h-20 text-slate-200 group-hover:text-primary transition-colors drop-shadow-sm" fill="currentColor" />
            <span className="font-bold text-2xl text-on-surface group-hover:text-primary transition-colors">Ano {year}</span>
          </motion.button>
        )) : (
          <div className="col-span-full py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
            <CloudLightning className="w-12 h-12 text-slate-300" />
            <p className="text-slate-500 font-medium">Nenhum documento encontrado na sua conta até o momento.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderMonths = () => (
    <div className="animate-fade-in space-y-8">
      <div className="flex items-center gap-5 mb-10">
        <button
          onClick={() => { setViewState('years'); setSelectedYear(null); }}
          className="w-14 h-14 flex items-center justify-center rounded-full bg-white hover:bg-surface-container transition-colors text-primary shadow-sm active:scale-95 border border-surface-container-high"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight">Competência {selectedYear}</h2>
          <p className="text-secondary font-body text-lg mt-1">Selecione o mês desejado para abrir o holerite correspondente.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {months.map(month => {
          const isAvailable = availableMonths.includes(month);
          return (
            <motion.button
              whileHover={isAvailable ? { y: -4 } : {}}
              whileTap={isAvailable ? { scale: 0.98 } : {}}
              key={month}
              onClick={() => {
                if (isAvailable) {
                  setSelectedMonth(month);
                  setViewState('document');
                }
              }}
              className={cn(
                "bg-white p-6 rounded-2xl border border-surface-container-high shadow-sm transition-all flex items-center gap-5 group text-left",
                isAvailable ? "hover:shadow-md hover:border-emerald-500/30 font-medium" : "opacity-60 grayscale cursor-not-allowed"
              )}
            >
              <div className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
                isAvailable ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white" : "bg-slate-100 text-slate-400"
              )}>
                {isAvailable ? <FileText className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
              </div>
              <div className="flex flex-col">
                <span className={cn(
                  "font-bold text-lg transition-colors",
                  isAvailable ? "text-on-surface group-hover:text-emerald-700" : "text-slate-400"
                )}>{month}</span>
                <span className="text-[10px] uppercase tracking-widest font-bold mt-1">
                  {isAvailable ? (
                    <span className="text-emerald-600 flex items-center gap-1">Disponível</span>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-1">Indisponível</span>
                  )}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  const renderDocument = () => (
    <div className="flex-1 flex flex-col gap-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewState('months')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition-colors text-primary active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-headline font-bold text-2xl tracking-tight text-on-surface">
              Holerite - {selectedMonth} {selectedYear}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-tertiary-fixed text-on-tertiary-fixed-variant px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">Confidencial</span>
              <span className="text-on-surface-variant text-xs flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-green-600" />
                Sincronizado na Nuvem
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {pdfUrl && (
            <a download={`${selectedMonth}-${selectedYear}.pdf`} href={pdfUrl} className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-white hover:opacity-90 transition-all font-semibold text-sm shadow-lg shadow-primary/20">
              <Download className="w-4 h-4" />
              Download
            </a>
          )}
        </div>
      </div>

      <div className="flex-1 bg-surface-container-low rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-inner min-h-[800px]">
        <div className="flex-1 overflow-hidden bg-surface-dim/30 relative flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-primary">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="font-bold animate-pulse">Buscando documento na nuvem...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-red-50/30">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-red-900 mb-2">Acesso Negado ou Falha</h3>
              <p className="text-red-700 max-w-md mx-auto mb-6">{error}</p>
              <div className="p-4 bg-white rounded-2xl border border-red-100 text-xs text-red-600 text-left space-y-2">
                <p><strong>Dicas de Resolução:</strong></p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Verifique sua conexão com a internet.</li>
                  <li>Garanta que o RH realizou a sincronização deste período.</li>
                  <li>Tente sair e entrar novamente no portal.</li>
                </ul>
              </div>
            </div>
          ) : pdfUrl ? (
            <object
              data={pdfUrl}
              type="application/pdf"
              className="w-full flex-1 min-h-[800px] border-none"
            >
              <div className="p-12 text-center text-on-surface-variant h-full flex flex-col items-center justify-center">
                <FileText className="w-16 h-16 opacity-30 mb-4" />
                <p className="font-medium text-on-surface">O PDF foi carregado mas seu navegador bloqueou a exibição interna.</p>
                <a href={pdfUrl} download className="text-primary font-bold mt-4 px-6 py-2 bg-primary/10 rounded-full hover:bg-primary/20 transition-all">
                  Clique aqui para Baixar e Visualizar
                </a>
              </div>
            </object>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-outline-variant/5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-on-surface">Segurança Digital</h4>
          </div>
          <p className="text-sm text-on-surface-variant leading-relaxed">Documento hospedado de forma criptografada no Supabase Cloud.</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-outline-variant/5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-primary">
              <Share2 className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-on-surface">Compartilhar</h4>
          </div>
          <p className="text-sm text-on-surface-variant leading-relaxed">Libere o acesso temporário deste holerite via link seguro.</p>
          <button className="mt-4 text-sm font-bold text-primary hover:underline flex items-center gap-1">
            Solicitar Link <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-10 flex-1 flex flex-col">
      {viewState === 'years' && renderYears()}
      {viewState === 'months' && renderMonths()}
      {viewState === 'document' && renderDocument()}
    </div>
  );
}
