import React from 'react';
import { MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface ContactButtonProps {
  variant?: 'fixed' | 'inline';
}

export default function ContactButton({ variant = 'fixed' }: ContactButtonProps) {
  // Verificar se estamos visualizando um documento para esconder o botão
  const isViewingDocument = sessionStorage.getItem('doc_viewState') === 'document';

  if (isViewingDocument) return null;

  return (
    <motion.a
      href="https://wa.me/5533999461526"
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "z-[100] flex items-center gap-3 bg-[#25D366] text-white transition-all no-underline group shadow-[0_10px_30px_rgba(37,211,102,0.3)] hover:bg-[#20ba5a]",
        variant === 'fixed' 
          ? "fixed bottom-6 right-6 md:bottom-10 md:right-10 px-5 py-3 md:px-7 md:py-4 rounded-full" 
          : "relative w-fit mx-auto px-4 py-2 rounded-xl mt-4"
      )}
    >
      <div className="flex flex-col items-start leading-tight">
        <span className="text-[10px] uppercase font-bold opacity-90 tracking-widest">Suporte Holerium</span>
        <span className="font-black text-sm md:text-base">WhatsApp</span>
      </div>
      <div className="w-8 h-8 md:w-10 md:h-10 bg-white/20 rounded-full flex items-center justify-center ml-auto pointer-events-none group-hover:rotate-12 transition-transform">
        <MessageSquare className="w-5 h-5 md:w-6 md:h-6 fill-white" />
      </div>
    </motion.a>
  );
}
