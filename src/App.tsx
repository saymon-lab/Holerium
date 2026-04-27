import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeRegistry from './pages/EmployeeRegistry';
import DocumentViewer from './pages/DocumentViewer';
import SyncSettings from './pages/SyncSettings';
import SuperAdminConsole from './pages/SuperAdminConsole';
import AccessLogs from './pages/AccessLogs';
import DevLogin from './pages/DevLogin';
import Maintenance from './pages/Maintenance';
import { supabase } from './lib/supabase';

function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const [maintenanceData, setMaintenanceData] = useState<{ active: boolean, allowed_cpfs: string[] } | null>(null);
  const location = useLocation();

  useEffect(() => {
    async function checkMaintenance() {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'maintenance_mode')
          .single();

        if (error) {
          console.error('Error fetching maintenance mode:', error);
          setMaintenanceData({ active: false, allowed_cpfs: [] });
          return;
        }

        setMaintenanceData({
          active: data?.value?.active || false,
          allowed_cpfs: data?.value?.allowed_cpfs || []
        });
      } catch (err) {
        setMaintenanceData({ active: false, allowed_cpfs: [] });
      }
    }

    checkMaintenance();
  }, []);

  // Bypass logic
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const isDeveloper = ['superadmin', 'Desenvolvedor Geral', 'Desenvolvedor Master'].includes(currentUser.role);
  const isAllowedByCpf = (maintenanceData?.allowed_cpfs || []).includes(currentUser.cpf);

  // Also bypass developer login page
  if (location.pathname === '/ldevacess' || location.pathname === '/maintenance' || location.pathname === '/login') {
    return <>{children}</>;
  }

  if (maintenanceData?.active === true && !isDeveloper && !isAllowedByCpf) {
    return <Navigate to="/maintenance" replace />;
  }

  if (maintenanceData === null) return <div className="min-h-screen bg-[#050f2b]" />; // Silent loading state

  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <MaintenanceGuard>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/ldevacess" element={<DevLogin />} />
          <Route path="/maintenance" element={<Maintenance />} />

          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<EmployeeRegistry />} />
            <Route path="/documents" element={<DocumentViewer />} />
            <Route path="/rendimentos" element={<DocumentViewer />} />
            <Route path="/settings" element={<SyncSettings />} />
            <Route path="/superadmin" element={<SuperAdminConsole />} />

            {/* Fallbacks */}
            <Route path="/logs" element={<AccessLogs />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </MaintenanceGuard>
    </Router>
  );
}
