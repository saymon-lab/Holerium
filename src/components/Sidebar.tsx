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
  { icon: FileText, label: 'Meus Documentos', path: '/documents' },
  { icon: ShieldAlert, label: 'Console Admin', path: '/admin' },
  { icon: History, label: 'Logs de Auditoria', path: '/logs' },
  { icon: Settings, label: 'Meu Perfil', path: '/settings' },
  { icon: Shield, label: 'Console Geral', path: '/superadmin' },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
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
  const userAvatar = currentUser?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80';
  const userIsSuper = ['Desenvolvedor Geral', 'superadmin'].includes(userRole);
  const userIsAdmin = ['Administrador do Sistema', 'Administrador', 'admin', 'superadmin', 'Desenvolvedor Geral'].includes(userRole);

  const visibleNavItems = navItems.filter(item => {
    if (userIsSuper) return true;

    try {
      const permsSaved = localStorage.getItem('menu_permissions_v1');
      const perms = permsSaved ? JSON.parse(permsSaved) : {
        admin: ['/dashboard', '/documents', '/admin', '/logs', '/settings'],
        collaborator: ['/dashboard', '/documents', '/settings']
      };

      if (userIsAdmin) return perms.admin.includes(item.path);
      return perms.collaborator.includes(item.path);
    } catch {
      if (userIsAdmin) return item.path !== '/superadmin';
      return item.path === '/documents' || item.path === '/settings' || item.path === '/dashboard';
    }
  });

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={cn(
          "fixed inset-0 bg-primary/20 backdrop-blur-sm z-40 transition-opacity lg:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <aside className={cn(
        "h-screen fixed left-0 top-0 bg-[#0B1F5B] border-r border-white/5 flex-col py-8 px-4 gap-2 z-50 transition-all duration-300 lg:translate-x-0 lg:flex shadow-2xl overflow-hidden",
        isOpen ? "translate-x-0" : "-translate-x-full",
        isCollapsed ? "lg:w-20" : "lg:w-72"
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
                className="bg-white/5 p-3 rounded-2xl border border-white/5 min-w-[160px]"
              >
                <div className="text-white font-black text-xs leading-tight tracking-tight truncate w-full">{userName}</div>
                <div className="text-[#E9C176] text-[8px] mt-1 font-black uppercase tracking-widest bg-[#E9C176]/10 inline-block px-2 py-0.5 rounded-full">
                  {userIsSuper ? 'Desenvolvedor' : userIsAdmin ? 'Admin' : 'Colaborador'}
                </div>
              </motion.div>
            )}
          </div>
          {!isCollapsed && (
            <button onClick={onClose} className="lg:hidden p-2 text-white/40 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <nav className="flex flex-col gap-1">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => {
                  if (item.path === '/documents') {
                    // Resetar estado de visualização
                    sessionStorage.removeItem('doc_viewState');
                    sessionStorage.removeItem('doc_selectedYear');
                    sessionStorage.removeItem('doc_selectedMonth');
                    navigate('/documents', { state: { reset: Date.now() } });
                  } else {
                    navigate(item.path);
                  }
                  onClose();
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ease-in-out text-white/60 hover:bg-white/5 hover:text-white w-full text-left overflow-hidden",
                  isActive && "text-[#E9C176] font-bold border-r-[4px] border-[#E9C176] bg-white/5 shadow-sm shadow-black/20",
                  isCollapsed && "justify-center px-0 gap-0"
                )}
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0 transition-transform", isActive ? "text-[#E9C176]" : "text-white/40", !isActive && "group-hover:scale-110")} />
                {!isCollapsed && (
                  <motion.span 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-sm font-semibold whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto px-4 pt-8">
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('currentUser');
              sessionStorage.removeItem('doc_viewState');
              sessionStorage.removeItem('doc_selectedYear');
              sessionStorage.removeItem('doc_selectedMonth');
              onClose();
              navigate('/login');
            }}
            className={cn(
              "flex mb-4 items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ease-in-out text-red-400 hover:bg-red-500/10 w-full",
              isCollapsed && "justify-center px-0 gap-0"
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Sair</span>}
          </button>

          <div className={cn(
            "p-4 rounded-xl bg-white/5 border border-white/5 transition-all duration-300",
            isCollapsed && "px-2 py-4 flex flex-col items-center"
          )}>
            {!isCollapsed ? (
              <>
                <p className="text-[10px] font-bold text-[#E9C176] mb-1 uppercase tracking-widest">Status do Sistema</p>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-[10px] text-white/50 font-bold uppercase tracking-tight">Serviço Ativo</p>
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
