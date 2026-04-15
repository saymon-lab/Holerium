import React from 'react';
import { X, ShieldCheck, Code, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-primary/20 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
          >
            {/* Header / Accent */}
            <div className="h-24 bg-[#0B1F5B] relative overflow-hidden flex items-center px-10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12 blur-xl" />
              <h2 className="text-2xl font-black text-white font-headline tracking-tight relative z-10">
                Sobre o Holerium
              </h2>
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all z-20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-10 space-y-8">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="mt-1 w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-[#0B1F5B]/80 font-medium leading-relaxed">
                    O Holerium foi desenvolvido para facilitar o acesso a documentos trabalhistas em um ambiente seguro, organizado e intuitivo.
                  </p>
                </div>

                <div className="flex items-start gap-4">
                  <div className="mt-1 w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0">
                    <Fingerprint className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-[#0B1F5B]/80 font-medium leading-relaxed">
                    A plataforma oferece mais praticidade para colaboradores e administradores na gestão de holerites, recibos, férias e arquivos corporativos.
                  </p>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
                    <Code className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Desenvolvimento</p>
                    <p className="text-sm font-black text-[#0B1F5B]">Adrian Saymon</p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="bg-[#0B1F5B] text-white px-8 py-3 rounded-full font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#0B1F5B]/20"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Bottom Accent */}
            <div className="bg-surface-container-low/50 py-3 px-10 border-t border-slate-50 flex justify-center">
              <span className="text-[8px] font-bold text-secondary/40 uppercase tracking-[0.3em]">
                Enterprise Document System
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
