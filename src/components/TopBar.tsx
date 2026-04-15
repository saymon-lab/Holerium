import React from 'react';
import { Menu } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  return (
    <header className="w-full sticky top-0 z-40 bg-slate-50/80 backdrop-blur-md flex justify-between items-center px-6 lg:px-8 h-20">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-primary hover:bg-primary/5 rounded-xl transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        <svg width="220" height="60" viewBox="0 0 220 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="scale-75 origin-left">
          <rect x="0" y="0" width="48" height="48" rx="12" fill="url(#grad_top)" />
          <path d="M14 14V34M34 14V34M14 24H34" stroke="white" stroke-width="3" stroke-linecap="round" />
          <text x="60" y="32" font-family="Poppins, Inter, sans-serif" font-size="22" font-weight="600" fill="#0B1F5B" className="dark:fill-white">
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
          <a href="/dashboard" className="text-sm font-bold text-primary hover:text-[#E9C176] transition-colors">Início</a>
          <a href="/documents" className="text-sm font-bold text-slate-400 hover:text-primary transition-colors">Arquivos</a>
        </nav>
      </div>
    </header>
  );
}
