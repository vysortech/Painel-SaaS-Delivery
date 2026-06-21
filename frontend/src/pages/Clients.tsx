import { useState, useEffect } from 'react';
import { useClients } from '../hooks/useClients';
import { ClientList } from '../components/clients/ClientList';
import { ClientForm } from '../components/clients/ClientForm';
import { ConnectionScreen } from '../components/whatsapp/ConnectionScreen';
import { Toast, type ToastMessage } from '../components/common/Toast';
import type { TenantConfig } from '../types';
import { Trash2, Copy, CheckCircle } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';

export default function Clients() {
  const { tenants, saveClient, deleteClient, toggleStatus, logoutWhatsapp, mutate } = useClients();
  const { socket } = useSocket('admin'); // Listen as admin or general
  const [activeTab, setActiveTab] = useState<'lista' | 'cadastro'>('lista');
  const [editingTenant, setEditingTenant] = useState<TenantConfig | null>(null);
  
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [connectingTenant, setConnectingTenant] = useState<TenantConfig | null>(null);
  const [linkModalToken, setLinkModalToken] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      mutate();
    };

    socket.on('instance.connection_update', handleUpdate);

    return () => {
      socket.off('instance.connection_update', handleUpdate);
    };
  }, [socket, mutate]);

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
          showToast('Cliente salvo com sucesso!', 'success');
          setActiveTab('lista');
          if (token) setLinkModalToken(token);
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
      setConnectingTenant(tenant);
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

      {connectingTenant && (
          <ConnectionScreen 
              tenantId={connectingTenant.instancia} // Simulação: usando instancia como ID
              instanceName={connectingTenant.instancia}
              onClose={() => setConnectingTenant(null)}
          />
      )}

      {/* Link Copy Modal */}
      {linkModalToken && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex justify-center items-center p-4">
            <div className="bg-[#111827] border border-blue-500/30 w-full max-w-md rounded-2xl shadow-2xl p-6 text-center">
               <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-bold text-white mb-2">Cliente Salvo!</h3>
               <p className="text-gray-400 text-sm mb-6">
                  Envie o link abaixo para o cliente conectar o WhatsApp remotamente.
               </p>
               
               <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 flex items-center justify-between mb-6">
                  <span className="text-gray-300 text-sm truncate mr-2 select-all">
                     {`${window.location.origin}/conectar/${linkModalToken}`}
                  </span>
                  <button 
                     onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/conectar/${linkModalToken}`);
                        showToast('Link copiado!', 'success');
                     }}
                     className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-md transition-colors flex-shrink-0"
                     title="Copiar Link"
                  >
                     <Copy className="w-4 h-4" />
                  </button>
               </div>
               
               <button onClick={() => setLinkModalToken(null)} className="w-full px-6 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-bold transition-colors">
                  Fechar
               </button>
            </div>
         </div>
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
