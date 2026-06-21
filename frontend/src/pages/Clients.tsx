import React, { useState } from 'react';
import useSWR from 'swr';
import { Plus, Settings, Power, Trash2, Bot, CreditCard, Clock, X, Save, Search, CheckCircle2, AlertCircle, MessageCircle, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import type { TenantConfig } from '../types';

const fetcher = (url: string) => api.get(url).then(res => res.data);

const TagInput = ({ label, placeholder, tags, setTags, isPhone = false, isNumericOnly = false }: { label: string, placeholder: string, tags: string[], setTags: (t: string[]) => void, isPhone?: boolean, isNumericOnly?: boolean }) => {
  const [inputValue, setInputValue] = useState(isPhone ? '55' : '');

  const handleAdd = () => {
    if (inputValue.trim() !== '' && inputValue.trim() !== '55') {
      setTags([...tags, inputValue.trim()]);
      setInputValue(isPhone ? '55' : '');
    }
  };

  const handleRemove = (indexToRemove: number) => {
    setTags(tags.filter((_, index) => index !== indexToRemove));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;
      if (isNumericOnly || isPhone) {
          val = val.replace(/\D/g, ''); // Remove tudo que não for número
      }
      if (isPhone) {
          if (!val.startsWith('55') && val.length > 0) {
              val = '55' + val;
          }
      }
      setInputValue(val);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <div className="flex gap-2 mb-2">
        <input 
          type="text" 
          className="flex-1 bg-[#18181b] border border-gray-700/50 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleChange}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
        />
        <button type="button" onClick={handleAdd} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <span key={index} className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-200 rounded-full text-sm flex items-center gap-2">
            {tag}
            <button type="button" onClick={() => handleRemove(index)} className="hover:text-red-400">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};

export default function Clients() {
  const getLocalDateString = (offsetDays = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const { data: tenants, mutate } = useSWR('/config', fetcher, { refreshInterval: 5000 });
  const [activeTab, setActiveTab] = useState<'lista' | 'cadastro'>('lista');
  const [filter, setFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [createdLinkModal, setCreatedLinkModal] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 4000);
  };
  
  const [telefones, setTelefones] = useState<string[]>([]);
  const [botoesTempo, setBotoesTempo] = useState<string[]>([]);

  const handleOpenCreate = () => {
    setFormData({
      instancia: '', nome_empresa: '', 
      chave_pix: '', nome_pix: '',
      data_vencimento: getLocalDateString(30), status_assinatura: 'ativo',
      plano_tipo: 'recorrente', contexto_loja: '',
      nome_atendente: 'Alice', valor_assinatura: 0, dias_carencia: 7,
      telefone_whatsapp: ''
    });
    setTelefones([]);
    setBotoesTempo(['10', '20', '30']);
    setEditingTenant(null);
    setActiveTab('cadastro');
  };

  const handleOpenEdit = (tenant: any) => {
    setFormData({ ...tenant, data_vencimento: tenant.data_vencimento?.split('T')[0] || '', plano_tipo: tenant.plano_tipo || 'recorrente', contexto_loja: tenant.contexto_loja || '', dias_carencia: tenant.dias_carencia || 0 });
    setTelefones(tenant.telefone_admin ? tenant.telefone_admin.split(',').map((t: string) => t.trim()).filter(Boolean) : []);
    setBotoesTempo(tenant.botoes_tempo ? tenant.botoes_tempo.split(',').map((t: string) => t.trim()).filter(Boolean) : []);
    setEditingTenant(tenant);
    setActiveTab('cadastro');
  };

  const handleRenovarPagamento = () => {
     let dias = 30;
     if (formData.plano_tipo === 'teste') dias = 7;
     if (formData.plano_tipo === 'avulso') dias = 30;
     
     let dateObj = new Date();
     if (formData.data_vencimento) {
       const [y, m, d] = formData.data_vencimento.split('-');
       dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
     }
     dateObj.setDate(dateObj.getDate() + dias);
     
     const yyyy = dateObj.getFullYear();
     const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
     const dd = String(dateObj.getDate()).padStart(2, '0');
     
     setFormData({
        ...formData,
        data_vencimento: `${yyyy}-${mm}-${dd}`,
        status_assinatura: 'ativo'
     });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        telefone_admin: telefones.join(','),
        botoes_tempo: botoesTempo.join(',')
      };

      if (!editingTenant) {
        await api.post('/config', payload);
      } else {
        await api.put(`/config/${editingTenant?.instancia}`, payload);
      }
      
      mutate();
      setCreatedLinkModal(`${window.location.origin}/conectar/${formData.connect_token || formData.instancia}`);
      showToast('Cliente salvo com sucesso!', 'success');
    } catch {
      showToast('Erro ao salvar cliente.', 'error');
    }
  };

  const confirmDelete = async () => {
    if (deleteModal) {
       try {
          await api.delete(`/config/${deleteModal}`);
          mutate();
          showToast('Cliente removido com sucesso!', 'success');
       } catch {
          showToast('Erro ao remover cliente.', 'error');
       }
       setDeleteModal(null);
    }
  };

  const handleToggleStatus = async (tenant: TenantConfig) => {
      try {
         const newStatus = tenant.status_assinatura === 'ativo' ? 'bloqueado' : 'ativo';
         await api.put(`/config/${tenant.instancia}`, { ...tenant, status_assinatura: newStatus });
         mutate();
         showToast(`Status alterado para ${newStatus.toUpperCase()}`, 'success');
      } catch {
         showToast('Erro ao alterar status', 'error');
      }
  };

  const filteredTenants = tenants?.filter((t: TenantConfig) => {
    const matchesFilter = filter === 'todos' || t.status_assinatura === filter;
    const nome = t.nome_empresa || '';
    const inst = t.instancia || '';
    const matchesSearch = nome.toLowerCase().includes(searchTerm.toLowerCase()) || inst.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  }) || [];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      
      {activeTab === 'lista' ? (
      <>
          <div className="flex justify-between items-center border-b border-gray-800 pb-4">
            <div>
               <h2 className="text-2xl font-bold text-white">Gestão de Clientes</h2>
               <p className="text-gray-400 text-sm mt-1">Gerencie tenants, assinaturas e limites de IA.</p>
            </div>
            <button onClick={handleOpenCreate} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all">
              <Plus className="w-5 h-5"/> Novo Canal (Cadastro)
            </button>
          </div>

          <div className="flex gap-4 items-center bg-[#111827] p-4 rounded-xl border border-gray-800">
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

          <div className="bg-[#111827] border border-gray-800 rounded-xl shadow-xl overflow-hidden">
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
                                    🟡 Aguardando Conexão
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
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {tenant.status_conexao === 'CONNECTED' ? (
                            <button onClick={async () => {
                                if (window.confirm('Tem certeza que deseja desconectar o WhatsApp?')) {
                                    try {
                                        await api.post(`/config/${tenant.instancia}/logout`);
                                        showToast('WhatsApp desconectado!', 'success');
                                        mutate();
                                    } catch(e) {
                                        showToast('Erro ao desconectar.', 'error');
                                    }
                                }
                            }} title="Desconectar WhatsApp" className="px-3 py-1.5 text-xs text-orange-400 hover:bg-orange-500/20 rounded font-semibold border border-orange-500/30 flex items-center gap-1 transition-all">
                                <Power className="w-3 h-3"/> Desconectar
                            </button>
                        ) : (
                            <button onClick={() => {
                                const token = tenant.connect_token || tenant.instancia;
                                setCreatedLinkModal(`${window.location.origin}/conectar/${token}`);
                            }} title="Conectar WhatsApp" className="px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/20 rounded font-semibold border border-emerald-500/30 flex items-center gap-1 transition-all">
                                <Plus className="w-3 h-3"/> Conectar
                            </button>
                        )}
                        <button onClick={() => handleToggleStatus(tenant)} title={tenant.status_assinatura === 'ativo' ? 'Bloquear' : 'Desbloquear'} 
                          className={`p-2 rounded ${tenant.status_assinatura === 'ativo' ? 'text-red-400 hover:bg-red-500/20' : 'text-emerald-400 hover:bg-emerald-500/20'}`}>
                          <Power className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleOpenEdit(tenant)} className="p-2 text-blue-400 hover:bg-blue-500/20 rounded">
                          <Settings className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteModal(tenant.instancia)} className="p-2 text-red-500 hover:bg-red-500/20 rounded">
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
      ) : (
      // Aba de Cadastro (Premium Design)
      <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-200">
          <div className="mb-6 flex items-center gap-4">
             <button onClick={() => setActiveTab('lista')} className="text-gray-400 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 p-2 rounded-full">
                <ArrowLeft className="w-5 h-5" />
             </button>
             <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{editingTenant ? 'Editar Canal de Atendimento' : 'Configure seu novo canal para começar a receber mensagens'}</h2>
                <p className="text-sm text-gray-400 mt-1">{editingTenant ? 'Atualize as configurações do cliente.' : 'Preencha os dados abaixo para provisionar um novo Tenant no painel SaaS.'}</p>
             </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6 pb-20">
             {/* Evolution Go Whatsapp Block */}
             <div className="bg-[#0f1219] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                 <div className="p-6 border-b border-gray-800/60 bg-[#12161f]">
                     <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-emerald-500/10 flex items-center justify-center rounded-xl border border-emerald-500/20">
                             <MessageCircle className="w-6 h-6 text-emerald-400" />
                         </div>
                         <div>
                             <h3 className="text-lg font-bold text-white">WhatsApp - Evolution Go</h3>
                             <p className="text-sm text-gray-400">Canal do WhatsApp para atendimento ao cliente</p>
                         </div>
                     </div>
                 </div>
                 
                 <div className="p-6 space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                             <label className="block text-sm font-medium text-gray-300 mb-1">Nome de Exibição <span className="text-red-500">*</span></label>
                             <input required type="text" 
                                className="w-full bg-[#18181b] border border-gray-700/50 rounded-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder-gray-600"
                                placeholder="Ex: Suporte WhatsApp"
                                value={formData.nome_empresa || ''} onChange={e => setFormData({...formData, nome_empresa: e.target.value})} 
                             />
                             <p className="text-xs text-gray-500 mt-2">Nome amigável para identificação do cliente</p>
                         </div>
                         <div>
                             <label className="flex items-center justify-between text-sm font-medium text-gray-300 mb-1">
                                 Nome do Canal (Instância) *
                             </label>
                             <input required disabled={!!editingTenant} type="text" 
                                className="w-full bg-[#131316] border border-gray-800 rounded-lg p-3 text-gray-400 outline-none focus:border-[#0ea5e9]"
                                value={formData.instancia || ''} 
                                onChange={e => setFormData({...formData, instancia: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')})} 
                                placeholder="Digite o nome da instância (ex: pizzaria_filial1)"
                             />
                             <p className="text-xs text-gray-500 mt-2">Nome usado internamente pela API (sem espaços ou caracteres especiais).</p>
                         </div>
                     </div>

                     <div>
                         <label className="block text-sm font-medium text-gray-300 mb-1">Número do WhatsApp Principal</label>
                         <div className="flex">
                             <span className="bg-[#131316] border border-gray-800 border-r-0 rounded-l-lg p-3 text-gray-500 font-medium text-sm flex items-center justify-center min-w-[3rem]">BR +55</span>
                             <input type="text" 
                                className="w-full bg-[#18181b] border border-gray-700/50 rounded-r-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder-gray-600"
                                placeholder="DDD + Número (Que vai conectar no painel)"
                                value={formData.telefone_whatsapp ? formData.telefone_whatsapp.replace(/^55/, '') : ''}
                                onChange={e => {
                                   const val = e.target.value.replace(/\D/g, '');
                                   setFormData({...formData, telefone_whatsapp: val ? '55' + val : ''});
                                }}
                             />
                         </div>
                     </div>


                     <div className="pt-4 border-t border-gray-800/50">
                         <h4 className="text-sm font-bold text-gray-200 mb-4">Configurações da Instância</h4>
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <label className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer group bg-[#131316] p-3 rounded-lg border border-gray-800/50 hover:border-emerald-500/30 transition-all">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900" 
                                    checked={formData.sempre_online || false} onChange={e => setFormData({...formData, sempre_online: e.target.checked})} />
                                <span className="group-hover:text-emerald-400 transition-colors">Sempre Online</span>
                            </label>
                            <label className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer group bg-[#131316] p-3 rounded-lg border border-gray-800/50 hover:border-emerald-500/30 transition-all">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900" 
                                    checked={formData.rejeitar_chamadas || false} onChange={e => setFormData({...formData, rejeitar_chamadas: e.target.checked})} />
                                <span className="group-hover:text-emerald-400 transition-colors">Rejeitar Chamadas</span>
                            </label>
                            <label className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer group bg-[#131316] p-3 rounded-lg border border-gray-800/50 hover:border-emerald-500/30 transition-all">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900" 
                                    checked={formData.marcar_lidas || false} onChange={e => setFormData({...formData, marcar_lidas: e.target.checked})} />
                                <span className="group-hover:text-emerald-400 transition-colors">Marcar como Lidas</span>
                            </label>
                            <label className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer group bg-[#131316] p-3 rounded-lg border border-gray-800/50 hover:border-emerald-500/30 transition-all">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900" 
                                    checked={formData.ignorar_grupos || false} onChange={e => setFormData({...formData, ignorar_grupos: e.target.checked})} />
                                <span className="group-hover:text-emerald-400 transition-colors">Ignorar Grupos</span>
                            </label>
                            <label className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer group bg-[#131316] p-3 rounded-lg border border-gray-800/50 hover:border-emerald-500/30 transition-all">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900" 
                                    checked={formData.ignorar_status || false} onChange={e => setFormData({...formData, ignorar_status: e.target.checked})} />
                                <span className="group-hover:text-emerald-400 transition-colors">Ignorar Status</span>
                            </label>
                         </div>
                     </div>
                 </div>
             </div>

             {/* Inteligencia Artificial Block */}
             <div className="bg-[#0f1219] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                 <div className="p-6 border-b border-gray-800/60 bg-[#12161f]">
                     <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-purple-500/10 flex items-center justify-center rounded-xl border border-purple-500/20">
                             <Bot className="w-6 h-6 text-purple-400" />
                         </div>
                         <div>
                             <h3 className="text-lg font-bold text-white">Inteligência Artificial & UX</h3>
                             <p className="text-sm text-gray-400">Personalidade e regras de negócio do agente virtual</p>
                         </div>
                     </div>
                 </div>
                 
                 <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Nome do Agente (Robô) <span className="text-red-500">*</span></label>
                            <input required type="text" 
                                className="w-full bg-[#18181b] border border-gray-700/50 rounded-lg p-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder-gray-600" 
                                placeholder="Ex: Alice, Robô do Zé"
                                value={formData.nome_atendente || ''} onChange={e => setFormData({...formData, nome_atendente: e.target.value})} 
                            />
                        </div>

                        <TagInput 
                            label="Telefones Admins (conversam com bot)" 
                            placeholder="Ex: 5511999999999" 
                            tags={telefones} 
                            setTags={setTelefones} 
                            isNumericOnly={true}
                        />
                        
                        <TagInput 
                            label="Tempo de Resposta (Minutos)" 
                            placeholder="Ex: 10" 
                            tags={botoesTempo} 
                            setTags={setBotoesTempo} 
                            isNumericOnly={true}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Contexto Específico (Regras / Preços / Cardápio)</label>
                        <textarea 
                            className="w-full bg-[#18181b] border border-gray-700/50 rounded-xl p-4 text-white font-mono text-sm h-32 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-y transition-all placeholder-gray-600"
                            placeholder="Descreva aqui o contexto exclusivo desta loja..."
                            value={formData.contexto_loja || ''} onChange={e => setFormData({...formData, contexto_loja: e.target.value})}
                        />
                    </div>
                 </div>
             </div>

             {/* Gestao Financeira Block */}
             <div className="bg-[#0f1219] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                 <div className="p-6 border-b border-gray-800/60 bg-[#12161f]">
                     <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-blue-500/10 flex items-center justify-center rounded-xl border border-blue-500/20">
                             <CreditCard className="w-6 h-6 text-blue-400" />
                         </div>
                         <div>
                             <h3 className="text-lg font-bold text-white">Financeiro & Assinatura</h3>
                             <p className="text-sm text-gray-400">Gerenciamento de planos, cobranças e bloqueios</p>
                         </div>
                     </div>
                 </div>
                 
                 <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                       <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Chave PIX da Loja</label>
                          <input type="text" className="w-full bg-[#18181b] border border-gray-700/50 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-gray-600" 
                             placeholder="E-mail, CPF, Celular..."
                             value={formData.chave_pix || ''} onChange={e => setFormData({...formData, chave_pix: e.target.value})} />
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Nome do Beneficiário PIX</label>
                          <input type="text" className="w-full bg-[#18181b] border border-gray-700/50 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-gray-600" 
                             placeholder="Nome que aparece no comprovante"
                             value={formData.nome_pix || ''} onChange={e => setFormData({...formData, nome_pix: e.target.value})} />
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 pt-6 border-t border-gray-800/50">
                       <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Plano</label>
                          <select className="w-full bg-[#18181b] border border-gray-700/50 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" 
                             value={formData.plano_tipo || 'recorrente'} 
                             onChange={e => {
                                const novoPlano = e.target.value;
                                const baseForm = {...formData, plano_tipo: novoPlano};
                                if (!editingTenant) {
                                   const dias = novoPlano === 'teste' ? 7 : 30;
                                   baseForm.data_vencimento = getLocalDateString(dias);
                                }
                                setFormData(baseForm);
                             }}>
                             <option value="recorrente">Recorrente Mensal</option>
                             <option value="avulso">Avulso (30 dias)</option>
                             <option value="teste">Teste (7 dias)</option>
                          </select>
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Valor do Plano</label>
                          <div className="flex">
                             <span className="bg-[#131316] border border-gray-800 border-r-0 rounded-l-lg p-3 text-gray-500 font-medium text-sm flex items-center justify-center">R$</span>
                             <input type="text" className="w-full bg-[#18181b] border border-gray-700/50 rounded-r-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" 
                                value={(() => {
                                  const val = formData.valor_assinatura;
                                  if (val === undefined || val === null || (val as any) === '') return '0,00';
                                  const num = typeof val === 'string' ? parseFloat(val) : val;
                                  return isNaN(num) ? '0,00' : num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                })()} 
                                onChange={e => {
                                  const digits = e.target.value.replace(/\D/g, '');
                                  const numValue = digits ? parseInt(digits, 10) / 100 : 0;
                                  setFormData({...formData, valor_assinatura: numValue});
                                }} />
                          </div>
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Vencimento</label>
                          <input type="date" className="w-full bg-[#18181b] border border-gray-700/50 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" 
                             value={formData.data_vencimento || ''} onChange={e => setFormData({...formData, data_vencimento: e.target.value})} />
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Carência (Dias)</label>
                          <input type="text" className="w-full bg-[#18181b] border border-gray-700/50 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed" 
                             disabled={formData.plano_tipo === 'teste'}
                             value={formData.plano_tipo === 'teste' ? '0' : (formData.dias_carencia ?? 0)} 
                             onChange={e => {
                                const digits = e.target.value.replace(/\D/g, '');
                                setFormData({...formData, dias_carencia: digits ? parseInt(digits, 10) : 0});
                             }} 
                          />
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                          <select className="w-full bg-[#18181b] border border-gray-700/50 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" 
                             value={formData.status_assinatura || 'ativo'} onChange={e => setFormData({...formData, status_assinatura: e.target.value})}>
                             <option value="ativo">Pago / Ativo</option>
                             <option value="inativo">Inativo</option>
                             <option value="bloqueado">Bloqueado</option>
                          </select>
                       </div>
                    </div>
                    
                    <div className="flex justify-end pt-6">
                       <button type="button" onClick={handleRenovarPagamento} className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 text-sm transition-colors">
                          <CreditCard className="w-4 h-4"/> Renovar +30 Dias Automático
                       </button>
                    </div>
                 </div>
             </div>

             <div className="flex justify-end gap-4 pt-4 pb-12">
                <button type="submit" className="px-10 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all">
                   <Save className="w-5 h-5" /> {editingTenant ? 'Salvar Configurações' : 'Criar Cliente (Tenant)'}
                </button>
             </div>
          </form>
      </div>
      )}

      {/* Delete Confirmation Modal */}
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

      {/* Global Toast Notification */}
      {toast && (
         <div className="fixed bottom-6 right-6 z-[70] animate-in slide-in-from-bottom-5 fade-in duration-300">
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
