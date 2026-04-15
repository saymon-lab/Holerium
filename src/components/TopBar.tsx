import React from 'react';
import { Menu } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface TopBarProps {
  onMenuClick: () => void;
  onToggleSidebar?: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  return (
    <header className="w-full sticky top-0 z-40 bg-[#0B1F5B] flex justify-between items-center px-6 lg:px-8 h-20 shadow-md">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-white hover:bg-white/10 rounded-xl transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Desktop Toggle Button */}
        <button 
          onClick={onToggleSidebar}
          className="hidden lg:flex p-2 -ml-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-90"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <svg width="220" height="60" viewBox="0 0 220 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="scale-75 origin-left">
          <rect x="0" y="0" width="48" height="48" rx="12" fill="white" />
          <path d="M14 14V34M34 14V34M14 24H34" stroke="#0B1F5B" stroke-width="4" stroke-linecap="round" />
          <text x="60" y="32" font-family="Poppins, Inter, sans-serif" font-size="22" font-weight="600" fill="white">
            Holerium
          </text>
          <defs>
            <linearGradient id="grad_top" x1="0" y1="0" x2="48" y2="48">
              <stop offset="0%" stop-color="#0B1F5B" />
              <stop offset="100%" stop-color="#2563EB" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="flex items-center gap-10">
        <nav className="hidden md:flex items-center gap-8">
          <a href="/dashboard" className="text-sm font-bold text-white hover:text-[#E9C176] transition-colors">Início</a>
          <a href="/documents" className="text-sm font-bold text-white/50 hover:text-white transition-colors">Arquivos</a>
        </nav>
      </div>
    </header>
  );
}
