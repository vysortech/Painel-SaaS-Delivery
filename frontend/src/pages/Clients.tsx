import { useState } from 'react';
import { useClients } from '../hooks/useClients';
import { ClientList } from '../components/clients/ClientList';
import { ClientForm } from '../components/clients/ClientForm';
import { Toast, type ToastMessage } from '../components/common/Toast';
import type { TenantConfig } from '../types';
import { Save, MessageCircle, Trash2 } from 'lucide-react';

export default function Clients() {
  const { tenants, saveClient, deleteClient, toggleStatus, logoutWhatsapp } = useClients();
  const [activeTab, setActiveTab] = useState<'lista' | 'cadastro'>('lista');
  const [editingTenant, setEditingTenant] = useState<TenantConfig | null>(null);
  
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [createdLinkModal, setCreatedLinkModal] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 4000);
  };

  const handleOpenCreate = () => {
    setEditingTenant(null);
    setActiveTab('cadastro');
  };

  const handleOpenEdit = (tenant: TenantConfig) => {
    setEditingTenant(tenant);
    setActiveTab('cadastro');
  };

  const handleSave = async (payload: any, isEditing: boolean) => {
      try {
          const token = await saveClient(payload, isEditing);
          setCreatedLinkModal(`${window.location.origin}/conectar/${token}`);
          showToast('Cliente salvo com sucesso!', 'success');
      } catch (e) {
          showToast('Erro ao salvar cliente.', 'error');
      }
  };

  const confirmDelete = async () => {
      if (deleteModal) {
          try {
              await deleteClient(deleteModal);
              showToast('Cliente removido com sucesso!', 'success');
          } catch (e) {
              showToast('Erro ao remover cliente.', 'error');
          }
          setDeleteModal(null);
      }
  };

  const handleToggleStatus = async (tenant: TenantConfig) => {
      try {
          const newStatus = await toggleStatus(tenant);
          showToast(`Status alterado para ${newStatus.toUpperCase()}`, 'success');
      } catch {
          showToast('Erro ao alterar status', 'error');
      }
  };

  const handleDisconnect = async (instancia: string) => {
      if (window.confirm('Tem certeza que deseja desconectar o WhatsApp?')) {
          try {
              await logoutWhatsapp(instancia);
              showToast('WhatsApp desconectado!', 'success');
          } catch(e) {
              showToast('Erro ao desconectar.', 'error');
          }
      }
  };

  const handleConnect = (tenant: TenantConfig) => {
      const token = tenant.connect_token || tenant.instancia;
      setCreatedLinkModal(`${window.location.origin}/conectar/${token}`);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 relative">
      
      {activeTab === 'lista' ? (
          <ClientList 
              tenants={tenants} 
              onCreate={handleOpenCreate} 
              onEdit={handleOpenEdit} 
              onDelete={(instancia) => setDeleteModal(instancia)}
              onToggleStatus={handleToggleStatus}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
          />
      ) : (
          <ClientForm 
              initialData={editingTenant} 
              onClose={() => setActiveTab('lista')} 
              onSave={handleSave} 
          />
      )}

      {/* Delete Modal */}
      {deleteModal && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex justify-center items-center p-4">
            <div className="bg-[#111827] border border-red-500/30 w-full max-w-md rounded-2xl shadow-2xl p-6 text-center">
               <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-bold text-white mb-2">Excluir Cliente?</h3>
               <p className="text-gray-400 text-sm mb-6">
                  Tem certeza que deseja excluir <b>{deleteModal}</b>? Esta ação removerá o cliente do banco de dados definitivamente e não pode ser desfeita.
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

      {/* Link Created Modal */}
      {createdLinkModal && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex justify-center items-center p-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-[#111827] border border-emerald-500/30 w-full max-w-lg rounded-2xl shadow-2xl p-8 text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-indigo-500"></div>
               <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  <MessageCircle className="w-10 h-10" />
               </div>
               <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Cliente Salvo!</h3>
               <p className="text-gray-400 text-sm mb-8">
                  O cliente foi configurado e gravado no banco de dados com sucesso. O link de conexão já está ativo e pronto para uso.
               </p>
               
               <div className="bg-[#18181b] border border-gray-700/50 rounded-xl p-4 mb-8 flex items-center justify-between gap-4">
                  <div className="truncate text-left flex-1">
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Link de Conexão</span>
                     <span className="text-indigo-400 font-mono text-sm truncate block">{createdLinkModal}</span>
                  </div>
                  <button 
                     onClick={() => {
                        navigator.clipboard.writeText(createdLinkModal);
                        showToast('Link copiado com sucesso!', 'success');
                     }} 
                     className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 p-3 rounded-lg transition-colors flex-shrink-0"
                     title="Copiar Link"
                  >
                     <Save className="w-5 h-5" />
                  </button>
               </div>

               <button 
                  onClick={() => {
                     setCreatedLinkModal(null);
                     setActiveTab('lista');
                     setEditingTenant(null);
                  }} 
                  className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
               >
                  Copiei, voltar para a lista
               </button>
            </div>
         </div>
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
