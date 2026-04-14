import React, { useState } from 'react';
import { 
  Calendar, 
  ChevronRight, 
  FileText, 
  ShieldCheck, 
  ArrowRight,
  Archive,
  ArrowUpRight,
  Lock
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser') || '{}');
    } catch { return {}; }
  });

  const handleOpenYear = (year: string) => {
    sessionStorage.setItem('doc_selectedYear', year);
    navigate('/documents');
  };

  return (
    <div className="p-8 lg:p-12 flex-1 flex flex-col gap-10 animate-fade-in overflow-y-auto bg-white">
      {/* Page Header */}
      <div className="max-w-3xl">
        <h1 className="text-4xl font-extrabold text-[#0B1F5B] tracking-tight mb-3 font-headline">Meus Documentos</h1>
        <p className="text-slate-500 text-lg leading-relaxed font-medium">
          Acesse seu histórico completo de demonstrativos de pagamento, informes de rendimentos e relatórios anuais de forma segura.
        </p>
      </div>

      {/* Years Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Year Card - 2026 */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="lg:col-span-8 bg-[#EBEBEB] rounded-[2.5rem] p-10 relative overflow-hidden group border border-slate-200 min-h-[420px] flex flex-col justify-between shadow-sm"
        >
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-12">
              <div className="w-16 h-16 rounded-xl bg-[#0B1F5B] flex items-center justify-center shadow-lg shadow-[#0B1F5B]/20">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-300/30 text-[#775a19] text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-300/50">
                <div className="w-1.5 h-1.5 rounded-full bg-[#E9C176]"></div>
                <span>Arquivo Corrente</span>
              </div>
            </div>
            
            <h2 className="text-7xl font-black text-[#0B1F5B] mb-4 font-headline tracking-tighter">Ano 2026</h2>
            <p className="text-slate-600 font-bold max-w-md text-lg">
              Documentação ativa do exercício fiscal atual.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-8">
            <button 
               onClick={() => handleOpenYear('2026')}
               className="bg-[#0B1F5B] text-white px-10 py-5 rounded-full font-bold flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-[#0B1F5B]/30 group"
            >
              <span>Abrir Pasta</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>

        {/* Previous Years Column - Temporarily hidden as requested */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Empty column or future archive years */}
        </div>
      </div>
    </div>
  );
}
