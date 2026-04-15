import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ContactButton from './ContactButton';
import AboutModal from './AboutModal';
import { Info } from 'lucide-react';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-surface overflow-x-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 lg:ml-72 flex flex-col min-h-screen w-full">
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 flex flex-col">
          <Outlet />
        </main>
        <footer className="py-8 px-12 mt-auto border-t border-slate-50 flex flex-col items-center gap-3">
          <button 
            onClick={() => setIsAboutOpen(true)}
            className="flex items-center gap-2 text-[10px] text-secondary/40 uppercase tracking-[0.2em] font-bold hover:text-primary transition-colors group"
          >
            Ambiente criptografado de ponta a ponta  •  © {new Date().getFullYear()} Holerium  •  Adrian Saymon
            <Info className="w-3 h-3 group-hover:scale-110 transition-transform" />
          </button>
        </footer>
        <ContactButton />
        <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      </div>
    </div>
  );
}
