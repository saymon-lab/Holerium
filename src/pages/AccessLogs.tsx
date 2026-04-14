import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Trash2,
  Filter,
  CheckCircle2,
  XSquare,
  User,
  Clock,
  ShieldCheck,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';

interface AccessLog {
  id: string;
  user: string;
  role: string;
  status: 'sucesso' | 'erro';
  detail: string;
  created_at: string;
}

export default function AccessLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'todos' | 'sucesso' | 'erro'>('todos');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('access_logs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Erro ao buscar logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = async () => {
    if (confirm('Deseja realmente limpar todo o histórico de auditoria no servidor?')) {
      try {
        const { error } = await supabase
          .from('access_logs')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (error) throw error;
        setLogs([]);
      } catch (err) {
        console.error('Erro ao limpar logs:', err);
      }
    }
  };


  const filteredLogs = logs.filter(log => {
    const matchSearch = (log.user?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.role?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.detail?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchFilter = filter === 'todos' || log.status === filter;

    return matchSearch && matchFilter;
  });

  return (
    <div className="p-10 flex-1 flex flex-col gap-8 animate-fade-in max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-5 mb-2">
        <button 
          onClick={() => navigate('/dashboard')}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-white hover:bg-slate-50 transition-colors text-primary shadow-sm border border-slate-100 active:scale-95"
          title="Voltar ao Início"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <History className="w-6 h-6" />
            </div>
            <h2 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight">Logs de Auditoria</h2>
          </div>
        </div>
      </div>

      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-secondary font-body max-w-2xl text-lg">Histórico completo de acessos e tentativas de entrada no sistema.</p>
        </div>

        <button
          onClick={handleClearLogs}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 font-bold text-sm bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-all border border-red-100 self-start"
        >
          <Trash2 className="w-4 h-4" />
          Limpar Tudo
        </button>
      </section>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Filtrar por nome, cargo ou detalhe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-surface-container-high rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
          />
        </div>

        <div className="flex bg-white border border-surface-container-high rounded-2xl p-1 shadow-sm">
          <button
            onClick={() => setFilter('todos')}
            className={cn("px-6 py-3 rounded-xl text-sm font-bold transition-all", filter === 'todos' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-secondary hover:text-primary")}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('sucesso')}
            className={cn("px-6 py-3 rounded-xl text-sm font-bold transition-all", filter === 'sucesso' ? "bg-tertiary-fixed text-on-tertiary-fixed-variant shadow-sm" : "text-secondary hover:text-primary")}
          >
            Sucessos
          </button>
          <button
            onClick={() => setFilter('erro')}
            className={cn("px-6 py-3 rounded-xl text-sm font-bold transition-all", filter === 'erro' ? "bg-red-50 text-red-600 shadow-sm" : "text-secondary hover:text-primary")}
          >
            Erros
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl overflow-hidden border border-surface-container-high shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-8 py-5 text-[11px] font-extrabold uppercase tracking-widest text-secondary">Instante</th>
                <th className="px-8 py-5 text-[11px] font-extrabold uppercase tracking-widest text-secondary">Usuário / Identidade</th>
                <th className="px-8 py-5 text-[11px] font-extrabold uppercase tracking-widest text-secondary">Nível</th>
                <th className="px-8 py-5 text-[11px] font-extrabold uppercase tracking-widest text-secondary">Status / Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-on-surface-variant">
                        <Clock className="w-4 h-4 opacity-30" />
                        <span className="text-sm font-mono">{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", log.status === 'sucesso' ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600")}>
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">{log.user}</p>
                          {log.detail && <p className="text-[10px] text-secondary font-medium">{log.detail}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-bold text-secondary uppercase tracking-tight">{log.role}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        {log.status === 'sucesso' ? (
                          <div className="flex items-center gap-1.5 text-green-700 bg-green-50 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-green-100">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Acesso Permitido
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-red-700 bg-red-50 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-red-100">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Bloqueado
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <ShieldCheck className="w-12 h-12 text-outline/20" />
                      <div>
                        <p className="font-bold text-on-surface">Nenhum evento registrado</p>
                        <p className="text-sm text-secondary">Todo novo login aparecerá automaticamente aqui.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
