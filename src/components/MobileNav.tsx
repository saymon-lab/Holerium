import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  ShieldAlert, 
  Settings,
  CircleUser,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

export default function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const currentUser = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('currentUser') || '{}');
    } catch { return {}; }
  }, []);

  const isAdmin = ['Administrador do Sistema', 'Administrador', 'admin', 'superadmin', 'Desenvolvedor Geral'].includes(currentUser?.role);

  const navItems = [
    { icon: Home, label: 'Início', path: '/dashboard', activeColor: 'text-[#E9C176]' },
    { icon: FileText, label: 'Holerites', path: '/documents', activeColor: 'text-emerald-500' },
    { icon: History, label: 'Rendimentos', path: '/rendimentos', activeColor: 'text-orange-400' },
    ...(isAdmin ? [{ icon: ShieldAlert, label: 'Admin', path: '/admin', activeColor: 'text-rose-500' }] : []),
    { icon: Settings, label: 'Perfil', path: '/settings', activeColor: 'text-sky-400' },
  ];

  const handleNavClick = (path: string) => {
    if (path === '/documents') {
      sessionStorage.removeItem('doc_viewState');
      sessionStorage.removeItem('doc_selectedYear');
      navigate(path, { state: { reset: true } });
    } else if (path === '/rendimentos') {
      sessionStorage.setItem('doc_viewState', 'rendimentos_years');
      navigate('/rendimentos', { state: { reset: true } });
    } else {
      navigate(path);
    }
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-[env(safe-area-inset-bottom,16px)] pt-2 mobile-bottom-nav-blur">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={cn(
                "relative flex flex-col items-center gap-1 py-3 px-4 transition-all duration-300",
                isActive ? item.activeColor : "text-slate-400"
              )}
            >
              <item.icon className={cn(
                "w-6 h-6 transition-all duration-300",
                isActive ? "scale-110" : "scale-100"
              )} />
              
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-widest transition-all duration-300",
                isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
              )}>
                {item.label}
              </span>

              {isActive && (
                <motion.div
                  layoutId="mobile-nav-dot"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 w-1.5 h-1.5 rounded-full bg-current"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
