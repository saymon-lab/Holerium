import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmployeeRegistry from './pages/EmployeeRegistry';
import DocumentViewer from './pages/DocumentViewer';
import SyncSettings from './pages/SyncSettings';
import SuperAdminConsole from './pages/SuperAdminConsole';
import AccessLogs from './pages/AccessLogs';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<EmployeeRegistry />} />
          <Route path="/documents" element={<DocumentViewer />} />
          <Route path="/settings" element={<SyncSettings />} />
          <Route path="/superadmin" element={<SuperAdminConsole />} />
          
          {/* Fallbacks */}
          <Route path="/logs" element={<AccessLogs />} />
        
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
