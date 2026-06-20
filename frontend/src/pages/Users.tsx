import React, { useState } from 'react';
import axios from 'axios';
import useSWR from 'swr';
import { UserPlus, Trash2, Edit2, Save, X, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

const fetcher = (url: string) => axios.get(url).then(res => res.data);

export default function Users() {
  const { data: users, mutate } = useSWR('/api/auth/users', fetcher);
  
  const [nome, setNome] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [editingUser, setEditingUser] = useState<any>(null);

  // New states for custom modals and toasts
  const [deleteModal, setDeleteModal] = useState<{ id: number, name: string } | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/auth/register', { nome, username, password });
      setNome('');
      setUsername('');
      setPassword('');
      mutate();
      showToast('Usuário cadastrado com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao criar usuário. Ele já pode existir.', 'error');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`/api/auth/users/${editingUser.id}`, { nome, username, password });
      setEditingUser(null);
      setNome('');
      setUsername('');
      setPassword('');
      mutate();
      showToast('Usuário atualizado com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao atualizar usuário.', 'error');
    }
  };

  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setNome(user.nome || '');
    setUsername(user.username || '');
    setPassword(''); // blank means don't change
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setNome('');
    setUsername('');
    setPassword('');
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    try {
      await axios.delete(`/api/auth/users/${deleteModal.id}`);
      setDeleteModal(null);
      mutate();
      showToast('Usuário removido com sucesso!', 'success');
    } catch (err) {
      showToast('Erro ao excluir usuário.', 'error');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-white border-b border-gray-800 pb-2">Usuários do Painel</h2>
      <p className="text-gray-400 mb-8">Gerencie quem tem acesso a este sistema operacional mestre.</p>

      <div className={`bg-[#111827] border ${editingUser ? 'border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.2)]' : 'border-gray-800'} rounded-xl p-6 shadow-xl mb-8 transition-all`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-lg font-semibold ${editingUser ? 'text-blue-400' : 'text-emerald-400'}`}>
             {editingUser ? `Editando Usuário: #${editingUser.id}` : 'Adicionar Novo Acesso'}
          </h3>
          {editingUser && (
             <button onClick={handleCancelEdit} className="text-gray-400 hover:text-white bg-gray-800 p-1.5 rounded-full">
                <X className="w-4 h-4"/>
             </button>
          )}
        </div>
        
        <form onSubmit={editingUser ? handleUpdate : handleCreate} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-gray-400 mb-1">Nome Completo</label>
            <input required type="text" className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 outline-none" 
               value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: João Silva" />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm text-gray-400 mb-1">Login (Username)</label>
            <input required type="text" className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-blue-500 outline-none" 
               value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))} placeholder="Ex: joao.admin" />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm text-gray-400 mb-1">{editingUser ? 'Nova Senha (vazio=manter)' : 'Senha'}</label>
            <div className="relative">
               <input type={showPassword ? "text" : "password"} required={!editingUser} className="w-full bg-gray-900 border border-gray-700 rounded p-2 pr-10 text-white focus:border-blue-500 outline-none" 
                  value={password} onChange={e => setPassword(e.target.value)} placeholder="********" />
               <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
               </button>
            </div>
          </div>
          <button type="submit" className={`px-6 py-2 rounded font-bold flex items-center gap-2 h-10 transition-all ${editingUser ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]'}`}>
            {editingUser ? <><Save className="w-4 h-4" /> Atualizar</> : <><UserPlus className="w-4 h-4" /> Cadastrar</>}
          </button>
        </form>
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-xl shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-800/50 text-gray-400 text-sm">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Nome</th>
              <th className="p-4">Login</th>
              <th className="p-4">Criado em</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {users?.map((u: any) => (
              <tr key={u.id} className={`hover:bg-gray-800/20 transition-colors ${editingUser?.id === u.id ? 'bg-blue-900/10' : ''}`}>
                <td className="p-4 text-gray-500 font-mono">#{u.id}</td>
                <td className="p-4 text-white font-bold">{u.nome || 'N/A'}</td>
                <td className="p-4 text-gray-300">{u.username}</td>
                <td className="p-4 text-gray-500 text-sm">{new Date(u.created_at).toLocaleString()}</td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                     <button onClick={() => handleOpenEdit(u)} className="p-2 text-blue-400 hover:bg-blue-500/20 rounded transition-colors" title="Editar Usuário">
                       <Edit2 className="w-4 h-4" />
                     </button>
                     <button onClick={() => setDeleteModal({ id: u.id, name: u.username })} className="p-2 text-red-500 hover:bg-red-500/10 rounded transition-colors" title="Excluir Usuário">
                       <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                </td>
              </tr>
            ))}
            {users?.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">Nenhum usuário cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Custom Delete Modal */}
      {deleteModal && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex justify-center items-center p-4">
            <div className="bg-[#111827] border border-red-500/30 w-full max-w-md rounded-2xl shadow-2xl p-6 text-center">
               <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-bold text-white mb-2">Excluir Acesso?</h3>
               <p className="text-gray-400 text-sm mb-6">
                  Tem certeza que deseja remover o acesso do usuário <b>{deleteModal.name}</b>?
               </p>
               <div className="flex justify-center gap-4">
                  <button onClick={() => setDeleteModal(null)} className="px-6 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 font-bold transition-colors">
                     Cancelar
                  </button>
                  <button onClick={confirmDelete} className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-colors">
                     Sim, Excluir!
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Global Toast Notification */}
      {toast && (
         <div className="fixed bottom-6 right-6 z-[70] animate-fade-in-up">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg border ${
               toast.type === 'success' ? 'bg-emerald-900/50 border-emerald-500/50 text-emerald-400' : 'bg-red-900/50 border-red-500/50 text-red-400'
            }`}>
               {toast.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
               <span className="font-medium text-white">{toast.message}</span>
               <button onClick={() => setToast(null)} className="ml-4 opacity-70 hover:opacity-100">
                  <X className="w-4 h-4" />
               </button>
            </div>
         </div>
      )}
    </div>
  );
}
