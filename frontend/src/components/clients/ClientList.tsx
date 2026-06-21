import React, { useState } from 'react';
import { Plus, Search, Power, Settings, Trash2, Bot, Clock } from 'lucide-react';
import type { TenantConfig } from '../../types';

interface ClientListProps {
    tenants: TenantConfig[];
    onCreate: () => void;
    onEdit: (tenant: TenantConfig) => void;
    onDelete: (instancia: string) => void;
    onToggleStatus: (tenant: TenantConfig) => void;
    onConnect: (tenant: TenantConfig) => void;
    onDisconnect: (instancia: string) => void;
}

export const ClientList: React.FC<ClientListProps> = ({ 
    tenants, onCreate, onEdit, onDelete, onToggleStatus, onConnect, onDisconnect 
}) => {
    const [filter, setFilter] = useState('todos');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTenants = tenants.filter((t: TenantConfig) => {
        const matchesFilter = filter === 'todos' || t.status_assinatura === filter;
        const nome = t.nome_empresa || '';
        const inst = t.instancia || '';
        const matchesSearch = nome.toLowerCase().includes(searchTerm.toLowerCase()) || inst.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <>
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                <div>
                   <h2 className="text-2xl font-bold text-white">Gestão de Clientes</h2>
                   <p className="text-gray-400 text-sm mt-1">Gerencie tenants, assinaturas e limites de IA.</p>
                </div>
                <button onClick={onCreate} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all">
                  <Plus className="w-5 h-5"/> Novo Canal (Cadastro)
                </button>
            </div>

            <div className="flex gap-4 items-center bg-[#111827] p-4 rounded-xl border border-gray-800 mt-6">
                 <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input type="text" placeholder="Buscar por nome ou instância..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:border-blue-500 outline-none" />
                 </div>
                 <div className="flex bg-gray-900 rounded-lg border border-gray-700 p-1">
                    <button onClick={() => setFilter('todos')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'todos' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>Todos</button>
                    <button onClick={() => setFilter('ativo')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'ativo' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-emerald-400'}`}>Ativos</button>
                    <button onClick={() => setFilter('inativo')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'inativo' ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`}>Inativos</button>
                    <button onClick={() => setFilter('bloqueado')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'bloqueado' ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:text-red-400'}`}>Bloqueados</button>
                 </div>
            </div>

            <div className="bg-[#111827] border border-gray-800 rounded-xl shadow-xl overflow-hidden mt-6">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-800/50 text-gray-400 text-sm">
                    <tr>
                      <th className="p-4 font-medium">Empresa / Instância</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Assinatura</th>
                      <th className="p-4 font-medium">Robô</th>
                      <th className="p-4 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredTenants.map((tenant: TenantConfig) => (
                      <tr key={tenant.instancia} className="hover:bg-gray-800/20 transition-colors group">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                             <div className="font-bold text-white text-base">{tenant.nome_empresa}</div>
                             <div>
                                {tenant.status_conexao === 'CONNECTED' ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                                        🟢 Conectado
                                    </span>
                                ) : tenant.status_conexao === 'PENDING' ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 uppercase tracking-wider">
                                        🟡 Aguardando
                                    </span>
                                ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wider">
                                        🔴 Desconectado
                                    </span>
                                )}
                             </div>
                          </div>
                          <div className="text-xs text-blue-400 font-mono mt-1">{tenant.instancia}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1
                            ${tenant.status_assinatura === 'ativo' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                              tenant.status_assinatura === 'inativo' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 
                              'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                            {tenant.status_assinatura.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-white font-medium">R$ {tenant.valor_assinatura}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Clock className="w-3 h-3"/> Vence: {tenant.data_vencimento?.split('T')[0] || 'N/A'}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-gray-300 flex items-center gap-2">
                             <Bot className="w-4 h-4 text-purple-400"/> {tenant.nome_atendente}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2 transition-opacity">
                            <div className="flex items-center gap-1">
                            {tenant.status_conexao === 'CONNECTED' ? (
                                <button onClick={() => onDisconnect(tenant.instancia)} title="Desconectar WhatsApp" className="px-3 py-1.5 text-xs text-orange-400 hover:bg-orange-500/20 rounded font-semibold border border-orange-500/30 flex items-center gap-1 transition-all">
                                    <Power className="w-3 h-3"/> Desconectar
                                </button>
                            ) : (
                                <button onClick={() => onConnect(tenant)} title="Conectar WhatsApp (Abrir Modal Admin)" className="px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/20 rounded font-semibold border border-emerald-500/30 flex items-center gap-1 transition-all">
                                    <Plus className="w-3 h-3"/> Conectar
                                </button>
                            )}
                                <button onClick={() => {
                                    const url = `${window.location.origin}/conectar/${tenant.connect_token}`;
                                    navigator.clipboard.writeText(url);
                                    alert('Link copiado para a área de transferência!');
                                }} title="Copiar Link para o Cliente" className="px-3 py-1.5 text-xs text-blue-400 hover:bg-blue-500/20 rounded font-semibold border border-blue-500/30 flex items-center gap-1 transition-all">
                                    <Bot className="w-3 h-3"/> Copiar Link
                                </button>
                            </div>
                            <button onClick={() => onToggleStatus(tenant)} title={tenant.status_assinatura === 'ativo' ? 'Bloquear' : 'Desbloquear'} 
                              className={`p-2 rounded ${tenant.status_assinatura === 'ativo' ? 'text-red-400 hover:bg-red-500/20' : 'text-emerald-400 hover:bg-emerald-500/20'}`}>
                              <Power className="w-4 h-4" />
                            </button>
                            <button onClick={() => onEdit(tenant)} className="p-2 text-blue-400 hover:bg-blue-500/20 rounded">
                              <Settings className="w-4 h-4" />
                            </button>
                            <button onClick={() => onDelete(tenant.instancia)} className="p-2 text-red-500 hover:bg-red-500/20 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredTenants.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum cliente encontrado.</td></tr>
                    )}
                  </tbody>
                </table>
            </div>
        </>
    );
};
