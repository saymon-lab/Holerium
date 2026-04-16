import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Download,
  ShieldCheck,
  FileText,
  Lock,
  CloudLightning,
  Folder
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';
import { supabase } from '@/src/lib/supabase';

export default function DocumentViewer() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser') || '{}');
    } catch { return {}; }
  });

  const [viewState, setViewState] = useState<'years' | 'months' | 'document' | 'rendimentos'>(() => {
    return (sessionStorage.getItem('doc_viewState') as any) || 'years';
  });
  const [selectedYear, setSelectedYear] = useState<string | null>(() => {
    return sessionStorage.getItem('doc_selectedYear');
  });
  const [selectedMonth, setSelectedMonth] = useState<string | null>(() => {
    return sessionStorage.getItem('doc_selectedMonth');
  });
  const [selectedDocument, setSelectedDocument] = useState<any | null>(() => {
    try {
      const saved = sessionStorage.getItem('doc_selectedDocument');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setDocError] = useState<string | null>(null);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [cloudDocuments, setCloudDocuments] = useState<any[]>([]);
  const [years, setYears] = useState<string[]>([]);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    '13º Salário (1ª Parc.)', '13º Salário (2ª Parc.)', 'Férias', 'Comprovante de Rendimentos'
  ];

  const userName = currentUser.name || "Usuário não identificado";
  const userCpf = currentUser.cpf || "000.000.000-00";

  const loadCloudData = async () => {
    try {
      setLoading(true);
      const cleanCpf = userCpf.replace(/\D/g, '');
      const formattedCpf = userCpf.includes('.') ? userCpf : userCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
      
      const searchTerms = Array.from(new Set([userCpf, cleanCpf, formattedCpf]));
      console.log(`[DEBUG] Buscando CPFs:`, searchTerms);

      const { data: documentsData, error: dbErr } = await supabase
        .from('documents')
        .select('*')
        .in('owner_cpf', searchTerms);

      if (dbErr) throw dbErr;

      const processedDocs = (documentsData || []).map(doc => ({
        ...doc,
        category: String(doc.category || '').toLowerCase().trim(),
        year: String(doc.year || '').trim(),
        month: String(doc.month || '').trim().padStart(2, '0')
      }));

      setCloudDocuments(processedDocs);

      const foundYears = new Set<string>();
      processedDocs
        .filter(doc => doc.month !== '16' && doc.category !== 'rendimentos')
        .forEach(doc => foundYears.add(doc.year));
      setYears(Array.from(foundYears).sort((a, b) => b.localeCompare(a)));

    } catch (err: any) {
      console.error('Erro:', err);
      setDocError('Falha ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (userCpf) loadCloudData(); }, [userCpf]);

  useEffect(() => {
    sessionStorage.setItem('doc_viewState', viewState);
    if (selectedYear) sessionStorage.setItem('doc_selectedYear', selectedYear);
    if (selectedMonth) sessionStorage.setItem('doc_selectedMonth', selectedMonth);
    if (selectedDocument) sessionStorage.setItem('doc_selectedDocument', JSON.stringify(selectedDocument));
  }, [viewState, selectedYear, selectedMonth, selectedDocument]);

  // Gerar URL pública do PDF quando um documento é selecionado
  useEffect(() => {
    const generateUrl = async () => {
      if (selectedDocument?.file_path) {
        try {
          const { data } = supabase.storage
            .from('receipts')
            .getPublicUrl(selectedDocument.file_path);
          
          if (data?.publicUrl) {
            setPdfUrl(data.publicUrl);
          }
        } catch (err) {
          console.error('Erro ao gerar URL do PDF:', err);
        }
      } else {
        setPdfUrl(null);
      }
    };
    generateUrl();
  }, [selectedDocument]);

  useEffect(() => {
    if (viewState === 'months' && selectedYear && cloudDocuments.length > 0) {
      const active = cloudDocuments
        .filter(doc => doc.year === String(selectedYear).trim() && doc.category !== 'rendimentos')
        .map(doc => {
          const mNum = parseInt(doc.month);
          return (mNum >= 1 && mNum <= 15) ? months[mNum - 1] : null;
        })
        .filter(Boolean) as string[];
      setAvailableMonths(Array.from(new Set(active)));
    }
  }, [selectedYear, cloudDocuments, viewState]);

  const renderMonths = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-5 mb-10">
        <button onClick={() => { setViewState('years'); setSelectedYear(null); }} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-primary shadow-sm border border-slate-100 font-bold">
          <ArrowLeft className="w-5 h-5" /> Voltar
        </button>
        <div>
          <h2 className="text-4xl font-extrabold text-on-surface">Competência {selectedYear}</h2>
          <p className="text-secondary text-lg">Selecione o mês desejado.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {months.filter(m => m !== 'Comprovante de Rendimentos').map(month => {
          const mIndex = months.indexOf(month) + 1;
          const monthNum = mIndex.toString().padStart(2, '0');
          const doc = cloudDocuments.find(d => 
            String(d.year).trim() === String(selectedYear).trim() && 
            parseInt(d.month) === mIndex &&
            d.category !== 'rendimentos'
          );
          const isAvailable = !!doc;

          return (
            <motion.button key={month} whileHover={isAvailable ? { y: -4 } : {}} onClick={() => { if (isAvailable) { setSelectedMonth(month); setSelectedDocument(doc); setViewState('document'); }}}
              className={cn("bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-5", isAvailable ? "border-emerald-500/30" : "opacity-60 grayscale cursor-not-allowed")}>
              <div className={cn("w-14 h-14 rounded-full flex items-center justify-center", isAvailable ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400")}>
                {isAvailable ? <FileText /> : <Lock />}
              </div>
              <div className="flex flex-col text-left">
                <span className={cn("font-bold text-lg", isAvailable ? "text-on-surface" : "text-slate-400")}>{month}</span>
                <span className={cn("text-[10px] font-bold uppercase", isAvailable ? "text-emerald-600" : "text-slate-400")}>{isAvailable ? "Disponível" : "Indisponível"}</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  const renderYears = () => (
    <div className="space-y-8 animate-fade-in">
       <div className="flex items-center gap-5 mb-10">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-primary shadow-sm border border-slate-100 font-bold">
          <ArrowLeft className="w-5 h-5" /> Voltar
        </button>
        <h2 className="text-5xl font-extrabold text-on-surface">Holerites</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {years.map(year => (
          <motion.button key={year} whileHover={{ y: -5 }} onClick={() => { setSelectedYear(year); setViewState('months'); }}
            className="bg-white p-8 rounded-3xl border shadow-sm flex flex-col items-center gap-4 h-56">
            <Folder className="w-20 h-20 text-slate-200" fill="currentColor" />
            <span className="font-bold text-2xl">Ano {year}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-10 flex-1 flex flex-col">
      {viewState === 'years' && renderYears()}
      {viewState === 'months' && renderMonths()}
      {viewState === 'document' && (
        <div className="flex-1 flex flex-col gap-6">
          <button onClick={() => setViewState('months')} className="w-fit flex items-center gap-2 px-4 py-2 rounded-full bg-white text-primary font-bold shadow-sm">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <iframe src={pdfUrl || ''} className="flex-1 rounded-3xl border-none min-h-[600px] bg-white shadow-inner" title="PDF Viewer" />
        </div>
      )}
    </div>
  );
}
