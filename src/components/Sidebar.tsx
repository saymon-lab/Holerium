import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  ShieldAlert,
  History,
  Settings,
  Shield,
  LogOut,
  X
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Início', path: '/dashboard' },
  { icon: FileText, label: 'Holerites', path: '/documents' },
  { icon: History, label: 'Meus Rendimentos', path: '/rendimentos' },
  { icon: ShieldAlert, label: 'Console Admin', path: '/admin' },
  { icon: History, label: 'Logs de Auditoria', path: '/logs', adminOnly: true },
  { icon: Settings, label: 'Meu Perfil', path: '/settings' },
  { icon: Shield, label: 'Console Geral', path: '/superadmin' },
];

export default function Sidebar({ isOpen, onClose, isCollapsed }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Efeito para sincronizar dados do perfil (como a foto) em tempo real do servidor
  useEffect(() => {
    if (currentUser?.cpf) {
      const syncProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('cpf', currentUser.cpf)
            .maybeSingle();

          if (data && !error) {
            // Se houver diferença (ex: foto nova), atualiza estado e storage
            if (data.avatar !== currentUser.avatar || data.role !== currentUser.role) {
              const updatedUser = { ...currentUser, ...data };
              setCurrentUser(updatedUser);
              localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            }
          }
        } catch (err) {
          console.error("Erro ao sincronizar perfil:", err);
        }
      };
      syncProfile();
    }
  }, [currentUser?.cpf]);

  const userName = currentUser?.name || 'Administrador';
  const userRole = currentUser?.role || 'user';
  const userAvatar = currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=020617&color=fff&size=256&bold=true`;
  const userIsSuper = ['Desenvolvedor Geral', 'superadmin'].includes(userRole);
  const userIsAdmin = ['Administrador do Sistema', 'Administrador', 'admin', 'superadmin', 'Desenvolvedor Geral'].includes(userRole);

  const visibleNavItems = navItems.filter(item => {
    // Esconder menus de documentos pessoais para o Desenvolvedor Master
    if (userIsSuper && (item.path === '/documents' || item.path === '/rendimentos')) {
      return false;
    }

    if (userIsSuper) return true;
    
    // Filtro simplificado de visibilidade
    if (item.path === '/superadmin' && !userIsSuper) return false;
    if (item.path === '/admin' && !userIsAdmin) return false;
    if (item.adminOnly && !userIsAdmin) return false;
    
    return true;
  });

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={cn(
          "fixed inset-0 bg-primary/40 backdrop-blur-sm z-40 transition-opacity lg:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <aside className={cn(
        "h-screen fixed left-0 top-0 bg-primary border-r border-white/5 flex flex-col py-8 px-4 gap-2 z-50 transition-all duration-500 ease-in-out shadow-2xl overflow-hidden",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        isCollapsed ? "lg:w-[88px]" : "lg:w-72"
      )}>
        <div className={cn(
          "flex items-center mb-10 transition-all duration-300",
          isCollapsed ? "justify-center px-0" : "justify-between px-4"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "rounded-full overflow-hidden bg-white/10 ring-2 ring-white/10 flex-shrink-0 aspect-square transition-all duration-300",
              isCollapsed ? "w-10 h-10" : "w-12 h-12"
            )}>
              <img
                src={userAvatar}
                alt={userName}
                className="w-full h-full object-cover text-[10px]"
                referrerPolicy="no-referrer"
              />
            </div>
            {!isCollapsed && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 min-w-0"
              >
                <div className="text-white font-black text-sm tracking-tight leading-tight line-clamp-2">{userName}</div>
                <div className={cn(
                  "text-[#E9C176] text-[8px] mt-1 font-black uppercase tracking-[0.2em] opacity-80",
                  !isOpen && "hidden lg:block"
                )}>
                  {userIsSuper ? 'Administrador Geral' : userIsAdmin ? 'Administrador' : 'Colaborador'}
                </div>
              </motion.div>
            )}
          </div>
          {!isCollapsed && (
            <button 
              onClick={onClose} 
              className="lg:hidden p-2.5 bg-white/5 text-[#E9C176] hover:bg-[#E9C176] hover:text-primary rounded-xl transition-all shadow-lg ring-1 ring-white/10 group"
            >
              <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          )}
        </div>

        <nav className="flex flex-col gap-1 items-start">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <div
                key={item.label}
                className={cn(
                  "w-full transition-all duration-300 group relative overflow-hidden rounded-xl",
                  isActive ? "bg-white/10 shadow-lg ring-1 ring-white/10" : "hover:bg-white/5",
                  isCollapsed && "flex justify-center"
                )}
              >
                {/* Active Indicator Bar - Movido para o container pai */}
                {isActive && !isCollapsed && (
                  <motion.div 
                    layoutId="active-nav-bar"
                    className="absolute left-0 top-3 bottom-3 w-1 bg-[#E9C176] rounded-r-full"
                  />
                )}
                
                <button
                  onClick={() => {
                    if (item.label === 'Holerites') {
                      sessionStorage.setItem('doc_viewState', 'years');
                      sessionStorage.removeItem('doc_selectedYear');
                      navigate('/documents', { state: { reset: true } });
                    } else if (item.label === 'Meus Rendimentos' || item.path === '/rendimentos') {
                      sessionStorage.setItem('doc_viewState', 'rendimentos_years');
                      navigate('/rendimentos', { state: { reset: true } });
                    } else {
                      navigate(item.path);
                    }
                    onClose();
                  }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-all duration-300 text-left outline-none",
                    isActive ? "text-white" : "text-white/60 group-hover:text-white",
                    isCollapsed ? "justify-center px-0 gap-0 w-full h-12" : "w-fit"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 flex-shrink-0 transition-transform", isActive ? "text-[#E9C176]" : "text-white/40", !isActive && "group-hover:scale-110")} />
                  {!isCollapsed && (
                    <motion.span 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-sm font-semibold whitespace-nowrap"
                    >
                      {item.label === 'Meus Rendimentos' ? 'Rendimentos' : item.label}
                    </motion.span>
                  )}
                </button>
              </div>
            );
          })}
          
          <div
            className={cn(
              "w-full transition-all duration-300 group relative overflow-hidden rounded-xl mt-2 hover:bg-red-500/10",
              isCollapsed && "flex justify-center"
            )}
          >
            <button
              onClick={() => {
                localStorage.removeItem('currentUser');
                sessionStorage.removeItem('doc_viewState');
                sessionStorage.removeItem('doc_selectedYear');
                sessionStorage.removeItem('doc_selectedMonth');
                onClose();
                navigate('/login');
              }}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-all duration-300 group text-red-500 outline-none",
                isCollapsed ? "justify-center px-0 gap-0 w-full h-12" : "w-fit"
              )}
            >
              <LogOut className="w-5 h-5 flex-shrink-0 transition-transform group-hover:-translate-x-1" />
              {!isCollapsed && <span className="text-sm font-black tracking-tight">Sair do Portal</span>}
            </button>
          </div>
        </nav>

        <div className="mt-auto px-4 pt-8">

          <div className={cn(
            "p-4 rounded-xl bg-white/5 border border-white/5 transition-all duration-300",
            isCollapsed && "px-2 py-4 flex flex-col items-center"
          )}>
            {!isCollapsed ? (
              <>
                <p className="text-[10px] font-black text-[#E9C176] mb-1 uppercase tracking-[0.2em]">Status do Sistema</p>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                  <p className="text-[10px] text-white/50 font-black uppercase tracking-widest">Serviço Ativo • v2.5.0</p>
                </div>
              </>
            ) : (
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
