import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users as UsersIcon, Settings as SettingsIcon, ShieldAlert, LogOut } from 'lucide-react';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = (e: React.MouseEvent) => {
      e.preventDefault();
      localStorage.removeItem('saas_token'); 
      sessionStorage.removeItem('saas_token');
      navigate('/login');
  };

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
          <button onClick={handleLogout} className="flex items-center gap-3 p-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors w-full text-left">
            <LogOut className="w-5 h-5" /> <span>Sair do Sistema</span>
          </button>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
};
