import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  ChevronRight, 
  FileText, 
  ShieldCheck, 
  ArrowRight,
  Archive,
  ArrowUpRight,
  Lock,
  Clock,
  Eye,
  Download,
  History as HistoryIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';

const recentActivities: any[] = [];

const categories = [
  { icon: Clock, label: 'Docs Recentes', desc: '0 novos arquivos adicionados hoje', color: 'text-blue-600', iconBg: 'bg-blue-50', path: '/documents' },
  { icon: ShieldCheck, label: 'Comprovantes', desc: 'Acesse seus recibos e comprovantes', color: 'text-emerald-600', iconBg: 'bg-emerald-50', path: '/documents' },
  { icon: ArrowUpRight, label: 'Meus Rendimentos', desc: 'Visualize seus informes anuais', color: 'text-amber-600', iconBg: 'bg-amber-50', path: '/documents' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser') || '{}');
    } catch { return {}; }
  });

  const [docCount, setDocCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      if (!currentUser?.cpf) return;
      const cleanCpf = currentUser.cpf.replace(/\D/g, '');
      const { data, count } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .or(`owner_cpf.eq."${currentUser.cpf}",owner_cpf.eq."${cleanCpf}"`);
      
      if (count !== null) setDocCount(count);
    };
    fetchStats();
  }, [currentUser?.cpf]);

  const handleViewAll = () => {
    sessionStorage.setItem('doc_viewState', 'years');
    sessionStorage.removeItem('doc_selectedYear');
    navigate('/documents', { state: { reset: true } });
  };

  const handleOpenYear = (year: string) => {
    sessionStorage.setItem('doc_selectedYear', year);
    sessionStorage.setItem('doc_viewState', 'months');
    navigate('/documents');
  };

  const handleOpenRendimentos = () => {
    sessionStorage.setItem('doc_viewState', 'rendimentos');
    navigate('/documents', { state: { rendimentos: true } });
  };

  const currentYear = new Date().getFullYear().toString();

  return (
    <div className="p-6 lg:p-10 flex-1 flex flex-col gap-8 animate-fade-in overflow-y-auto bg-surface">
      
      {/* Main Grid: Left (Hero + Categories) | Right (Recent Activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (8 units) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Hero Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] p-10 border border-outline-variant/30 shadow-[0_20px_50px_rgba(0,0,0,0.04)] relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50 group-hover:bg-blue-50 transition-colors duration-500" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-3 px-4 py-1.5 bg-slate-50 text-[#0B1F5B] text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-100 shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#E9C176] animate-pulse"></div>
                  <span>Arquivo Corrente</span>
                </div>
              </div>

              <div className="space-y-4 mb-12">
                <h2 className="text-4xl sm:text-6xl font-black text-[#0B1F5B] font-headline tracking-tighter">Ano {currentYear}</h2>
                <p className="text-slate-500 font-medium text-base sm:text-lg max-w-lg leading-relaxed">
                  Documentação ativa para o exercício fiscal atual. Seguro, auditado e criptografado.
                </p>
              </div>

              {/* Stats Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-10 mb-12 pt-10 border-t border-slate-50">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Documentos</p>
                  <p className="text-xl sm:text-2xl font-black text-[#0B1F5B]">{docCount || '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Última Atualização</p>
                  <p className="text-xl sm:text-2xl font-black text-[#0B1F5B]">Mar 2026</p>
                </div>
                <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 pt-6 sm:pt-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">Ativo</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button 
                  onClick={() => handleOpenYear(currentYear)}
                  className="bg-primary text-on-primary px-6 sm:px-10 py-4 sm:py-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-black/20 group"
                >
                  <FileText className="w-5 h-5" />
                  <span>Abrir Pasta</span>
                </button>
                <button 
                  onClick={handleViewAll}
                  className="bg-white text-slate-900 border border-slate-200 px-6 sm:px-10 py-4 sm:py-5 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <span>Ver Todos os Anos</span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* Categories / Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* NOVO: Card maior de Informações (Somente Admin/Master) */}
            {(['Administrador do Sistema', 'Administrador', 'admin', 'superadmin', 'Desenvolvedor Geral', 'Gestão'].includes(currentUser?.role)) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="md:col-span-2 lg:col-span-3 bg-white p-8 rounded-[2.5rem] border border-slate-100/50 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[2rem] bg-[#0B1F5B] flex items-center justify-center text-white shadow-xl shadow-blue-900/10">
                    <Archive className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-[#0B1F5B] font-headline tracking-tighter">Informações do Sistema</h3>
                    <p className="text-slate-400 font-medium">Status de sincronização e integridade de dados</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 px-6 py-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Base de Dados 100% Sincronizada</span>
                </div>
              </motion.div>
            )}

            {categories.map((cat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.05 }}
                onClick={cat.label === 'Meus Rendimentos' ? handleOpenRendimentos : handleViewAll}
                className="bg-white p-6 rounded-[2rem] border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all group cursor-pointer"
              >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 shadow-sm", cat.iconBg)}>
                  <cat.icon className={cn("w-6 h-6", cat.color)} />
                </div>
                <h3 className="text-lg font-black text-[#0B1F5B] mb-1 tracking-tight">{cat.label}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{cat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Column - Recent Activity (4 units) */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)] h-full flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-[#0B1F5B] font-headline">Atividade Recente</h2>
              <button className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3 flex-1 flex flex-col items-center justify-center text-center p-6">
              {recentActivities.length > 0 ? recentActivities.map((act) => (
                <div 
                  key={act.id} 
                  className="flex items-center gap-4 p-4 rounded-3xl border border-slate-50 hover:border-slate-100 hover:bg-slate-50/50 transition-all group cursor-pointer w-full"
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-100/50 flex items-center justify-center flex-shrink-0 group-hover:bg-white transition-colors">
                    <FileText className="w-6 h-6 text-[#0B1F5B]/30" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#0B1F5B] truncate text-left">{act.name}</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5 text-left">{act.date}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-slate-400 hover:text-[#0B1F5B] hover:bg-white rounded-lg transition-all shadow-sm">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-[#0B1F5B] hover:bg-white rounded-lg transition-all shadow-sm">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mx-auto">
                    <Calendar className="w-8 h-8 text-slate-200" />
                  </div>
                  <p className="text-xs font-black text-slate-300 uppercase tracking-widest leading-relaxed">Nenhuma atividade registrada <br /> no período atual</p>
                </div>
              )}
            </div>

            <button className="mt-8 w-full py-4 rounded-2xl border-2 border-dashed border-slate-100 text-slate-400 text-xs font-bold hover:border-slate-200 hover:text-slate-500 transition-all">
              Ver histórico completo
            </button>
          </div>
        </div>
      </div>

      {/* Footer / Previous Archives Section */}
      <div className="pt-8 border-t border-slate-100">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-black text-[#0B1F5B] font-headline tracking-tight">Arquivos Anteriores</h2>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide">
          {[2025].map((year) => (
            <motion.div
              key={year}
              whileHover={{ y: -5 }}
              onClick={() => handleOpenYear(year.toString())}
              className="min-w-[200px] bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col items-center gap-4 text-center group"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-[#0B1F5B] transition-colors">
                <HistoryIcon className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="text-2xl font-black text-[#0B1F5B]">{year}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Sincronizado</p>
              </div>
            </motion.div>
          ))}
          
          <div className="min-w-[200px] flex items-center justify-center">
            <button 
              onClick={handleViewAll}
              className="p-4 rounded-full border-2 border-dashed border-slate-200 text-slate-300 hover:border-[#0B1F5B] hover:text-[#0B1F5B] transition-all"
            >
              <ArrowUpRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
