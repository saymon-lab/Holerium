import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
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
        "flex-1 flex flex-col min-h-screen w-full transition-all duration-300",
        isSidebarCollapsed ? "lg:ml-[88px]" : "lg:ml-72"
      )}>
        <TopBar 
          onMenuClick={() => setIsSidebarOpen(true)} 
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        <main className="flex-1 flex flex-col">
          <Outlet />
        </main>
        <footer className="py-6 px-12 mt-auto border-t-[3px] border-slate-100 bg-surface shadow-[0_-1px_10px_rgba(0,0,0,0.02)] relative">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 min-h-[48px]">
            <button 
              onClick={() => setIsAboutOpen(true)}
              className="flex items-center gap-2 text-[10px] text-primary uppercase tracking-[0.2em] font-black hover:opacity-70 transition-all group"
            >
              © {new Date().getFullYear()} Holerium  •  Adrian Saymon
              <Info className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
            </button>

            <motion.a
              href="https://wa.me/5533999461526"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="md:absolute md:right-12 flex items-center gap-3 bg-[#25D366] text-white px-4 py-2 rounded-full shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all no-underline group"
            >
              <div className="flex flex-col items-start leading-none">
                <span className="text-[8px] uppercase font-bold opacity-90 tracking-widest">Suporte</span>
                <span className="font-black text-xs">WhatsApp</span>
              </div>
              <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center pointer-events-none group-hover:rotate-12 transition-transform">
                <MessageSquare className="w-3.5 h-3.5 fill-white" />
              </div>
            </motion.a>
          </div>
        </footer>
        <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      </div>
    </div>
  );
}
