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
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
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
        "h-screen w-72 fixed left-0 top-0 bg-[#0B1F5B] border-r border-white/5 flex-col py-8 px-4 gap-2 z-50 transition-transform duration-300 lg:translate-x-0 lg:flex shadow-2xl",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between mb-10 px-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 ring-2 ring-primary/5 flex-shrink-0 aspect-square">
              <img
                src={userAvatar}
                alt={userName}
                className="w-full h-full object-cover text-[10px]"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight tracking-tight">{userName}</div>
              <div className="text-white/40 text-[10px] mt-0.5 font-medium uppercase tracking-widest">
                {userIsSuper ? 'Desenvolvedor' : userIsAdmin ? 'Admin' : 'Colaborador'}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
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
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ease-in-out text-white/60 hover:bg-white/5 hover:text-white w-full text-left",
                  isActive && "text-[#E9C176] font-bold border-r-[4px] border-[#E9C176] bg-white/5 shadow-sm shadow-black/20"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-[#E9C176]" : "text-white/40")} />
                <span className="text-sm font-semibold">{item.label}</span>
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
            className="flex mb-4 items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ease-in-out text-red-400 hover:bg-red-500/10 w-full"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Sair</span>
          </button>

          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <p className="text-[10px] font-bold text-[#E9C176] mb-1 uppercase tracking-widest">Status do Sistema</p>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-tight">Serviço Ativo</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
