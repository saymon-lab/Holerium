import React, { useState } from 'react';
import { Lock, ArrowRight, Shield, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '@/src/lib/supabase';
import { cn } from '@/src/lib/utils';

export default function DevLogin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recordLog = async (user: string, role: string, status: 'sucesso' | 'erro', detail: string = '') => {
    try {
      await supabase.from('access_logs').insert([{
        user: user,
        role: role,
        status: status,
        detail: detail
      }]);
    } catch (err) {
      console.error('Falha ao registrar log:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Mesma lógica de validação do Root anterior
    if (password === 'dev2026') {
      localStorage.setItem('currentUser', JSON.stringify({ 
        name: 'Desenvolvedor Master', 
        role: 'Desenvolvedor Geral', 
        avatar: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=100&q=80' 
      }));
      await recordLog('Desenvolvedor', 'Root', 'sucesso', 'Acesso via Console Geral (/ldevacess)');
      navigate('/superadmin');
    } else {
      setError('Senha mestre de servidor incorreta.');
      await recordLog('Desconhecido', 'Intrusos', 'erro', 'Tentativa de acesso Root falhou em /ldevacess');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050f2b] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 blur-[120px] rounded-full"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl">
          {/* Header */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-[#E9C176] rounded-2xl flex items-center justify-center shadow-2xl shadow-[#E9C176]/20 mb-6 rotate-3">
              <Shield className="w-8 h-8 text-[#050f2b]" />
            </div>
            <h1 className="text-white text-3xl font-black tracking-tighter mb-2 italic">Dev Access</h1>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em]">Protocolo Interno Master</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2">
                Senha de Servidor
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-white/20 group-focus-within:text-[#E9C176] transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  className="block w-full pl-16 pr-6 py-6 bg-white/5 border border-white/10 rounded-[1.5rem] text-white font-black text-lg placeholder:text-white/10 focus:ring-4 focus:ring-[#E9C176]/5 focus:border-[#E9C176]/20 transition-all outline-none shadow-sm"
                  placeholder="••••••••••••" 
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="bg-red-500/10 text-red-400 p-5 rounded-3xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-red-500/20"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            <button 
              disabled={isSubmitting || !password}
              className="w-full bg-[#E9C176] text-[#050f2b] py-6 rounded-[1.5rem] font-black flex items-center justify-center space-x-4 group hover:scale-[1.02] tap-press transition-all shadow-2xl shadow-[#E9C176]/20 disabled:opacity-30 disabled:scale-100 disabled:grayscale"
            >
              <span className="uppercase tracking-[0.3em] text-[10px]">
                {isSubmitting ? 'Verificando...' : 'Autenticar Console'}
              </span>
              {!isSubmitting && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <button 
            onClick={() => navigate('/login')}
            className="mt-8 w-full text-white/20 hover:text-white/40 text-[9px] font-black uppercase tracking-[0.3em] transition-colors"
          >
            Voltar ao Login Público
          </button>
        </div>
      </motion.div>
    </div>
  );
}
