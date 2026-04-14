import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileText, 
  ShieldAlert, 
  History, 
  Settings, 
  Shield, 
  LogOut
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/src/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Início', path: '/dashboard' },
  { icon: FileText, label: 'Meus Documentos', path: '/documents' },
  { icon: ShieldAlert, label: 'Console Admin', path: '/admin' },
  { icon: History, label: 'Logs de Auditoria', path: '/logs' },
  { icon: Settings, label: 'Meu Perfil', path: '/settings' },
  { icon: Shield, label: 'Console Geral', path: '/superadmin' },
];

export default function Sidebar() {
  const [currentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const userName = currentUser?.name || 'Administrador';
  const userRole = currentUser?.role || 'Administrador';
  const userAvatar = currentUser?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80';
  const userLevel = userRole === 'Desenvolvedor Geral' ? 'Desenvolvedor' : currentUser ? 'Colaborador' : 'Acesso Total';
  const userIsAdmin = userRole === 'Administrador do Sistema' || userRole === 'Administrador';
  const userIsSuper = userRole === 'Desenvolvedor Geral';

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
    <aside className="hidden lg:flex h-screen w-72 fixed left-0 top-0 bg-white border-r border-slate-100 flex-col py-8 px-4 gap-2 z-40">
      <div className="mb-10 px-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 ring-2 ring-primary/5 flex-shrink-0 aspect-square">
          <img
            src={userAvatar}
            alt={userName}
            className="w-full h-full object-cover text-[10px]"
            referrerPolicy="no-referrer"
          />
        </div>
        <div>
          <div className="text-primary font-bold text-sm leading-tight tracking-tight">{userName}</div>
          <div className="text-slate-400 text-[10px] mt-0.5 font-medium">
            {userIsSuper ? 'Desenvolvedor' : userIsAdmin ? 'Admin' : 'Colaborador'}
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ease-in-out text-slate-500 hover:bg-slate-50 hover:text-primary",
              isActive && "text-primary font-bold border-r-[6px] border-[#E9C176] shadow-sm bg-white"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-slate-400")} />
                <span className="text-sm font-semibold">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-4 pt-8">
        <NavLink
          to="/login"
          onClick={() => {
            localStorage.removeItem('currentUser');
            sessionStorage.removeItem('doc_viewState');
            sessionStorage.removeItem('doc_selectedYear');
            sessionStorage.removeItem('doc_selectedMonth');
          }}
          className="flex mb-4 items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ease-in-out text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Sair</span>
        </NavLink>

        <div className="p-4 rounded-xl bg-surface-container-highest/50">
          <p className="text-xs font-bold text-primary mb-1">Status do Sistema</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-tertiary-fixed animate-pulse"></div>
            <span className="text-[10px] text-secondary">Serviço Ativo</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
