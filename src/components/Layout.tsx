import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MobileNav from './MobileNav';
import AboutModal from './AboutModal';
import { Info, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-surface overflow-x-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} 
        isCollapsed={isSidebarCollapsed}
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className={cn(
        "flex-1 flex flex-col min-h-screen w-full transition-all duration-300 pt-16 lg:pt-0",
        isSidebarCollapsed ? "lg:ml-[88px]" : "lg:ml-72"
      )}>
        <TopBar 
          onMenuClick={() => setIsSidebarOpen(true)} 
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        <main className="flex-1 flex flex-col pb-[110px] lg:pb-0">
          <div className="flex-1">
            <Outlet />
          </div>
          
          <footer className="py-0.5 px-4 sm:px-12 mt-auto border-t border-slate-50 bg-surface relative">
            <div className="flex flex-col items-center justify-center py-1 w-full relative">
              <div className="flex justify-end w-full px-2">
                <motion.a
                  href="https://wa.me/5533999461526"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 bg-[#25D366] text-white px-3.5 py-1.5 rounded-full shadow-lg transition-all no-underline group scale-95 origin-right"
                >
                  <div className="flex flex-col items-start leading-none gap-0">
                    <span className="text-[6.5px] uppercase font-bold opacity-90">Suporte</span>
                    <span className="font-black text-[10px]">WhatsApp</span>
                  </div>
                  <div className="w-4.5 h-4.5 bg-white/20 rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform">
                    <MessageSquare className="w-3 h-3 fill-white" />
                  </div>
                </motion.a>
              </div>

              <button 
                onClick={() => setIsAboutOpen(true)}
                className="mt-1 flex items-center gap-1.5 text-[8px] text-primary/60 uppercase tracking-[0.2em] font-black hover:opacity-70 transition-all group"
              >
                © {new Date().getFullYear()} Holerium  •  Todos os direitos reservados.
                <Info className="w-2.5 h-2.5 group-hover:rotate-12 transition-transform" />
              </button>
            </div>
          </footer>
        </main>
        <MobileNav />
        <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      </div>
    </div>
  );
}
