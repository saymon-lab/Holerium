import React from 'react';
import { Menu, Bell, Settings, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';

interface TopBarProps {
  onMenuClick: () => void;
  onToggleSidebar?: () => void;
}

export default function TopBar({ onMenuClick, onToggleSidebar }: TopBarProps) {
  const navigate = useNavigate();

  return (
    <header className="w-full sticky top-0 z-40 bg-primary flex justify-between items-center px-6 lg:px-10 h-20 shadow-xl border-b border-white/5">
      <div className="flex items-center gap-10">
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

          {/* Logo Branding */}
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-4 group cursor-pointer border-none bg-transparent p-0 outline-none"
          >
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-white/5 transition-transform group-hover:scale-105 active:scale-95">
              <span className="text-[#020617] font-black text-xl tracking-tighter">H</span>
            </div>
            <span className="text-white font-black text-xl tracking-tight">Holerium</span>
          </button>
        </div>

        {/* Global Navigation - Left (REMOVED) */}
      </div>

      <div className="flex items-center gap-6">
        {/* Utility Icons (REMOVED) */}

        {/* User Context - Right (Minimal) */}
        <div className="flex items-center gap-3 pl-2">
           {/* Avatar Removed */}
        </div>
      </div>
    </header>
  );
}
