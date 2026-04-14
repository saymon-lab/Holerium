import React, { useState } from 'react';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

export default function ContactButton() {
  const [showContact, setShowContact] = useState(false);

  // Verificar se estamos visualizando um documento para esconder o botão
  const isViewingDocument = sessionStorage.getItem('doc_viewState') === 'document';

  if (isViewingDocument) return null;

  return (
    <div className="fixed bottom-6 right-6 md:bottom-24 md:right-10 z-[100] flex flex-col items-end gap-3">
      {showContact && (
        <motion.a
          href="https://wa.me/5533999461526"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="flex items-center gap-3 bg-[#25D366] text-white px-4 py-3 md:px-6 md:py-4 rounded-2xl shadow-2xl hover:bg-[#20ba5a] transition-all group no-underline"
        >
          <div className="flex flex-col items-end text-white text-right">
            <span className="text-[8px] md:text-[10px] uppercase font-bold opacity-80 letter tracking-widest leading-none">Suporte Holerium</span>
            <span className="font-bold text-xs md:text-sm">Falar no WhatsApp</span>
          </div>
          <div className="w-8 h-8 md:w-10 md:h-10 bg-white/20 rounded-full flex items-center justify-center pointer-events-none">
            <MessageSquare className="w-4 h-4 md:w-6 md:h-6 fill-white" />
          </div>
        </motion.a>
      )}
      
      <button
        onClick={() => setShowContact(!showContact)}
        className={cn(
          "flex items-center gap-2 md:gap-3 px-4 py-3 md:px-6 md:py-4 rounded-full font-bold text-[10px] md:text-sm uppercase tracking-widest transition-all duration-300 shadow-xl",
          showContact ? "bg-white text-primary border border-primary/10" : "bg-primary text-white hover:scale-105 active:scale-95"
        )}
      >
        {showContact ? <ArrowRight className="w-4 h-4 md:w-5 md:h-5 rotate-90" /> : <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />}
        {showContact ? 'Fechar' : 'Contato'}
      </button>
    </div>
  );
}
