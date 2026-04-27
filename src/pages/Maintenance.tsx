import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Hammer, AlertTriangle, ArrowLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Maintenance() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#050f2b] flex items-center justify-center p-6 relative overflow-hidden font-display">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#E9C176]/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 blur-[120px] rounded-full"></div>

        {/* Animated Scanning Line */}
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent w-[50%] skew-x-[-20deg]"
        />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 sm:p-16 shadow-2xl text-center">

          {/* Main Visual Group */}
          <div className="relative mb-12 flex justify-center">
            {/* Main Icon */}
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="w-32 h-32 bg-[#E9C176] rounded-[2.5rem] flex items-center justify-center shadow-[0_20px_50px_rgba(233,193,118,0.3)] relative z-10"
            >
              <Hammer className="w-16 h-16 text-[#050f2b] stroke-[2.5]" />
            </motion.div>

            {/* Cones Group */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute -left-4 -bottom-4 z-20"
            >
              <div className="w-12 h-16 relative">
                <div className="absolute inset-0 bg-[#FF6B00] [clip-path:polygon(50%_0%,0%_100%,100%_100%)]"></div>
                <div className="absolute top-1/4 left-0 w-full h-1/4 bg-white/20"></div>
                <div className="absolute bottom-1/4 left-0 w-full h-1/5 bg-white/40"></div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute -right-4 -bottom-4 z-20"
            >
              <div className="w-12 h-16 relative scale-x-[-1]">
                <div className="absolute inset-0 bg-[#FF6B00] [clip-path:polygon(50%_0%,0%_100%,100%_100%)]"></div>
                <div className="absolute top-1/4 left-0 w-full h-1/4 bg-white/20"></div>
                <div className="absolute bottom-1/4 left-0 w-full h-1/5 bg-white/40"></div>
              </div>
            </motion.div>

            {/* Floating Warning */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -top-6 -right-6 bg-red-500 text-white p-4 rounded-2xl shadow-xl border border-red-400 rotate-12 flex items-center gap-3"
            >
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-white text-5xl sm:text-6xl font-black tracking-tighter mb-6 leading-tight font-headline">
              Site em <br />
              <span className="text-[#E9C176]">Manutenção</span>
            </h1>

            <p className="text-white/60 text-lg font-medium max-w-md mx-auto mb-10 leading-relaxed italic">
              Estamos preparando novidades incríveis e otimizando sua experiência. Voltamos em alguns instantes!
            </p>

            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-ping"></div>
                  <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Status: Atualizando</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-4">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto px-12 py-4 bg-[#E9C176] text-[#050f2b] rounded-2xl font-black text-sm tracking-widest uppercase hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#E9C176]/20 flex items-center justify-center gap-2 mx-auto cursor-pointer"
                >
                  <Check className="w-5 h-5" />
                  VOLTAR AO LOGIN
                </button>
                <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">
                  Redirecionando automaticamente em <span className="text-[#E9C176] font-black">{countdown}s</span>
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-8 text-center space-y-2">
          <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.4em]">Protocolo de Segurança Atividade v2.5.1</p>
          <p className="text-white/10 text-[9px] font-medium uppercase tracking-[0.2em]">© Holerium Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
