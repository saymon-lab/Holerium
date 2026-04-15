import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ContactButton from './ContactButton';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-surface overflow-x-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 lg:ml-72 flex flex-col min-h-screen w-full">
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 flex flex-col">
          <Outlet />
        </main>
        <footer className="py-8 px-12 text-center text-xs text-secondary/50 uppercase tracking-widest font-bold mt-auto">
          © {new Date().getFullYear()} • Holerium
        </footer>
        <ContactButton />
      </div>
    </div>
  );
}
