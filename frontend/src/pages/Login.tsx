import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, LogIn, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      if (res.data && res.data.token) {
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('saas_token', res.data.token);
        storage.setItem('saas_username', res.data.username);
        storage.setItem('saas_nome', res.data.nome);
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const errorResponse = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setError(errorResponse || 'Erro ao conectar no servidor. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1121] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
          Painel <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">SaaS Master</span>
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Acesso restrito para administradores
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-[#111827] py-8 px-4 shadow-[0_0_40px_rgba(37,99,235,0.1)] sm:rounded-xl sm:px-10 border border-gray-800">
          <form className="space-y-6" onSubmit={handleLogin}>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300">
                Usuário (Login)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  className="bg-gray-900 border border-gray-700 text-white block w-full pl-10 pr-3 py-2 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">
                Senha
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-900 border border-gray-700 text-white block w-full pl-10 pr-10 py-2 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="••••••••"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 bg-gray-900 border-gray-700 rounded text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-400">
                  Manter-se conectado
                </label>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Autenticando...' : <><LogIn className="w-5 h-5 mr-2"/> Entrar no Sistema</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
