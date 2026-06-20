import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Settings from './pages/Settings';
import Users from './pages/Users';
import Login from './pages/Login';
import Connect from './pages/Connect';
import { LayoutDashboard, Users as UsersIcon, Settings as SettingsIcon, ShieldAlert, LogOut } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('saas_token') || sessionStorage.getItem('saas_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-[#0B1121] text-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-[#111827] border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Painel SaaS Delivery</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/dashboard" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${location.pathname === '/dashboard' || location.pathname === '/' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <LayoutDashboard className="w-5 h-5" /> <span>Dashboard</span>
          </Link>
          <Link to="/clients" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${location.pathname === '/clients' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <UsersIcon className="w-5 h-5" /> <span>CRM (Clientes)</span>
          </Link>
          <Link to="/settings" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${location.pathname === '/settings' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <SettingsIcon className="w-5 h-5" /> <span>Configurações</span>
          </Link>
          <Link to="/users" className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${location.pathname === '/users' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <ShieldAlert className="w-5 h-5" /> <span>Acessos (Admins)</span>
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <Link to="/login" onClick={() => { localStorage.removeItem('saas_token'); sessionStorage.removeItem('saas_token'); }} className="flex items-center gap-3 p-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors w-full">
            <LogOut className="w-5 h-5" /> <span>Sair do Sistema</span>
          </Link>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/conectar/:instancia" element={<Connect />} />
        <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute><Layout><Clients /></Layout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><Layout><Users /></Layout></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
