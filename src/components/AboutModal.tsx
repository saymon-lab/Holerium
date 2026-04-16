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
            className="absolute inset-0 bg-primary/40 backdrop-blur-xl"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-surface-container-lowest rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden border border-white/50"
          >
            {/* Header / Accent */}
            <div className="h-32 bg-primary relative overflow-hidden flex items-center px-12">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl opacity-50" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#E9C176]/10 rounded-full -ml-16 -mb-16 blur-2xl" />

              <div className="relative z-10">
                <p className="text-[#E9C176] text-[10px] font-black uppercase tracking-[0.4em] mb-2">Conectado na Nuvem</p>
                <h2 className="text-3xl font-black text-white font-headline tracking-tighter">
                  Sobre o Holerium
                </h2>
              </div>

              <button
                onClick={onClose}
                className="absolute top-8 right-8 p-3 rounded-2xl bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all z-20 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-12 space-y-10">
              <div className="space-y-6">
                <div className="flex items-start gap-6 group">
                  <div className="mt-1 w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-500">
                    <ShieldCheck className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-on-surface/70 font-medium leading-relaxed italic text-lg text-justify">
                    O Holerium foi desenvolvido para facilitar o acesso a documentos trabalhistas em um ambiente seguro, organizado e intuitivo.
                  </p>
                </div>

                <div className="flex items-start gap-6 group">
                  <div className="mt-1 w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-500">
                    <Fingerprint className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-on-surface/70 font-medium leading-relaxed italic text-lg text-justify">
                    A plataforma oferece mais praticidade para colaboradores e administradores na gestão de holerites, recibos, férias e arquivos corporativos.
                  </p>
                </div>
              </div>

              <div className="pt-10 border-t border-surface-container-high flex flex-col sm:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center shadow-inner">
                    <Code className="w-6 h-6 text-primary opacity-40" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-secondary uppercase tracking-[0.3em] mb-1">Developer</p>
                    <p className="text-lg font-black text-primary tracking-tighter font-headline">Adrian Saymon</p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-full sm:w-auto bg-primary text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/20"
                >
                  Fechar janela
                </button>
              </div>
            </div>

            {/* Bottom Accent */}
            <div className="bg-surface-container-high/30 py-4 px-12 flex justify-center border-t border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#E9C176]"></div>
                <span className="text-[9px] font-black text-secondary/40 uppercase tracking-[0.5em]">
                  Enterprise Document System • 2026
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
