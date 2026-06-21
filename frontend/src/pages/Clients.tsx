import React, { useState } from 'react';
import useSWR from 'swr';
import { Plus, Settings, Power, Trash2, Bot, CreditCard, Clock, X, Save, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import type { TenantConfig } from '../types';

const fetcher = (url: string) => api.get(url).then(res => res.data);

// Componente auxiliar para Input de Tags (Telefones e Botões de Tempo)
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
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <div className="flex gap-2 mb-2">
        <input 
          type="text" 
          className="flex-1 bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-indigo-500 outline-none"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleChange}
          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
        />
        <button type="button" onClick={handleAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <span key={index} className="px-3 py-1 bg-gray-700 text-gray-200 rounded-full text-sm flex items-center gap-2">
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
  const [filter, setFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<any>({});
  
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 4000);
  };
  
  // Arrays para os inputs de Tag
  const [telefones, setTelefones] = useState<string[]>([]);
  const [botoesTempo, setBotoesTempo] = useState<string[]>([]);

  const handleOpenCreate = () => {
    setFormData({
      instancia: '', nome_empresa: '', 
      chave_pix: '', nome_pix: '',
      data_vencimento: getLocalDateString(30), status_assinatura: 'ativo',
      plano_tipo: 'recorrente', contexto_loja: '',
      nome_atendente: 'Alice', valor_assinatura: 0, dias_carencia: 7
    });
    setTelefones([]);
    setBotoesTempo(['10', '20', '30']);
    setIsCreating(true);
    setEditingTenant(null);
  };

  const handleOpenEdit = (tenant: any) => {
    setFormData({ ...tenant, data_vencimento: tenant.data_vencimento?.split('T')[0] || '', plano_tipo: tenant.plano_tipo || 'recorrente', contexto_loja: tenant.contexto_loja || '', dias_carencia: tenant.dias_carencia || 0 });
    setTelefones(tenant.telefone_admin ? tenant.telefone_admin.split(',').map((t: string) => t.trim()).filter(Boolean) : []);
    setBotoesTempo(tenant.botoes_tempo ? tenant.botoes_tempo.split(',').map((t: string) => t.trim()).filter(Boolean) : []);
    setEditingTenant(tenant);
    setIsCreating(false);
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

      if (isCreating) {
        await api.post('/config', payload);
      } else {
        await api.put(`/config/${editingTenant?.instancia}`, payload);
      }
      setIsCreating(false);
      setEditingTenant(null);
      mutate();
      showToast('Cliente salvo com sucesso!', 'success');
    } catch {
      showToast('Erro ao salvar cliente. Verifique a conexão com o Banco.', 'error');
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
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-gray-800 pb-4">
        <div>
           <h2 className="text-2xl font-bold text-white">Gestão de Clientes</h2>
           <p className="text-gray-400 text-sm mt-1">Gerencie tenants, assinaturas e limites de IA.</p>
        </div>
        <button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all">
          <Plus className="w-5 h-5"/> Adicionar Cliente
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
                  <div className="font-bold text-white text-base">{tenant.nome_empresa}</div>
                  <div className="text-xs text-blue-400 font-mono mt-1">{tenant.instancia}</div>
                  <div className="mt-2">
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
                    <button onClick={() => {
                        const token = tenant.connect_token || tenant.instancia;
                        navigator.clipboard.writeText(`${window.location.origin}/conectar/${token}`);
                        showToast('Link de conexão copiado!', 'success');
                    }} title="Copiar Link do QR Code" className="p-2 text-indigo-400 hover:bg-indigo-500/20 rounded">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                    </button>
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

      {(isCreating || editingTenant) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-start overflow-y-auto pt-10 pb-10">
           <div className="bg-[#111827] border border-gray-700 w-full max-w-4xl rounded-2xl shadow-2xl p-8 relative">
              <button onClick={() => { setIsCreating(false); setEditingTenant(null); }} className="absolute top-6 right-6 text-gray-400 hover:text-white bg-gray-800 p-2 rounded-full">
                 <X className="w-5 h-5" />
              </button>

              <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-3">
                 <Settings className="text-blue-500" /> {isCreating ? 'Criar Nova Operação (Tenant)' : `Editar Configurações: ${editingTenant?.nome_empresa}`}
              </h2>

              <form onSubmit={handleSave} className="space-y-6">
                 
                 <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-900/50 p-5 rounded-xl border border-gray-800 space-y-4">
                       <h3 className="text-lg font-semibold text-blue-400 border-b border-gray-800 pb-2">Identificação</h3>
                       <div>
                          <label className="block text-sm text-gray-400 mb-1">Nome da Empresa</label>
                          <input required type="text" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" 
                             value={formData.nome_empresa || ''} onChange={e => setFormData({...formData, nome_empresa: e.target.value})} />
                       </div>
                       <div>
                          <label className="block text-sm text-gray-400 mb-1 flex justify-between">
                             Instância (Evolution API / ID)
                             {formData.instancia && (
                                <button type="button" onClick={() => {
                                   navigator.clipboard.writeText(`${window.location.origin}/conectar/${formData.instancia}`);
                                   showToast('Link copiado! (Lembre-se de Salvar)', 'success');
                                }} className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1">
                                   🔗 Copiar Link Cliente
                                </button>
                             )}
                          </label>
                          <input required disabled={!isCreating} type="text" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white disabled:opacity-50" 
                             value={formData.instancia || ''} 
                             onChange={e => setFormData({...formData, instancia: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')})} 
                             placeholder="Ex: pizzaria_do_ze" />
                       </div>
                       
                       <TagInput 
                         label="Telefones dos Admins (Digite e clique no +)" 
                         placeholder="Ex: 5511999999999" 
                         tags={telefones} 
                         setTags={setTelefones} 
                         isPhone={true}
                       />
                    </div>

                    <div className="bg-gray-900/50 p-5 rounded-xl border border-gray-800 space-y-4">
                       <h3 className="text-lg font-semibold text-purple-400 border-b border-gray-800 pb-2">Inteligência Artificial & UX</h3>
                       <div>
                          <label className="block text-sm text-gray-400 mb-1">Nome do Agente (Robô)</label>
                          <input required type="text" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" placeholder="Ex: Alice, Robô do Zé"
                             value={formData.nome_atendente || ''} onChange={e => setFormData({...formData, nome_atendente: e.target.value})} />
                       </div>
                       
                       <TagInput 
                         label="Botões de Tempo (Minutos) (Digite e clique no +)" 
                         placeholder="Ex: 10" 
                         tags={botoesTempo} 
                         setTags={setBotoesTempo} 
                         isNumericOnly={true}
                       />
                    </div>
                 </div>

                 <div className="bg-gray-900/50 p-5 rounded-xl border border-gray-800 col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold text-emerald-400 border-b border-gray-800 pb-2">Configurações da Instância (Evolution Go)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500" 
                                checked={formData.sempre_online || false} onChange={e => setFormData({...formData, sempre_online: e.target.checked})} />
                            Sempre Online
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500" 
                                checked={formData.rejeitar_chamadas || false} onChange={e => setFormData({...formData, rejeitar_chamadas: e.target.checked})} />
                            Rejeitar Chamadas
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500" 
                                checked={formData.marcar_lidas || false} onChange={e => setFormData({...formData, marcar_lidas: e.target.checked})} />
                            Marcar como Lidas
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500" 
                                checked={formData.ignorar_grupos || false} onChange={e => setFormData({...formData, ignorar_grupos: e.target.checked})} />
                            Ignorar Grupos
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500" 
                                checked={formData.ignorar_status || false} onChange={e => setFormData({...formData, ignorar_status: e.target.checked})} />
                            Ignorar Status
                        </label>
                    </div>
                 </div>

                 <div className="bg-gray-900/50 p-5 rounded-xl border border-gray-800 space-y-4 col-span-2">
                    <h3 className="text-lg font-semibold text-orange-400 border-b border-gray-800 pb-2">Contexto Específico & Cardápio da Loja</h3>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Instruções Únicas e Cardápio (Copiado pelo n8n juntamente com o Prompt Mestre)</label>
                        <textarea 
                          className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-white font-mono text-sm h-32 focus:border-orange-500 outline-none resize-y"
                          placeholder="Ex: Pizzaria do Zé. Sabores: Calabresa, Mussarela..."
                          value={formData.contexto_loja || ''} onChange={e => setFormData({...formData, contexto_loja: e.target.value})}
                        />
                    </div>
                 </div>

                 <div className="bg-gray-900/50 p-5 rounded-xl border border-gray-800 space-y-4 col-span-2">
                    <h3 className="text-lg font-semibold text-emerald-400 border-b border-gray-800 pb-2">Gestão Financeira & Billing</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-sm text-gray-400 mb-1">Chave PIX da Loja</label>
                          <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" 
                             value={formData.chave_pix || ''} onChange={e => setFormData({...formData, chave_pix: e.target.value})} />
                       </div>
                       <div>
                          <label className="block text-sm text-gray-400 mb-1">Nome do Beneficiário PIX</label>
                          <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" 
                             value={formData.nome_pix || ''} onChange={e => setFormData({...formData, nome_pix: e.target.value})} />
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-gray-800">
                       <div>
                          <label className="block text-sm text-gray-400 mb-1">Tipo de Plano</label>
                          <select className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-emerald-500 outline-none" 
                             value={formData.plano_tipo || 'recorrente'} 
                             onChange={e => {
                                const novoPlano = e.target.value;
                                const baseForm = {...formData, plano_tipo: novoPlano};
                                if (isCreating) {
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
                          <label className="block text-sm text-gray-400 mb-1">Valor do Plano</label>
                          <div className="flex">
                             <span className="bg-gray-700 border border-gray-700 border-r-0 rounded-l p-2 text-gray-400 font-bold">R$</span>
                             <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-r p-2 text-white focus:border-emerald-500 outline-none" 
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
                          <label className="block text-sm text-gray-400 mb-1 flex justify-between">
                             Data de Vencimento
                          </label>
                          <input type="date" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-emerald-500 outline-none" 
                             value={formData.data_vencimento || ''} onChange={e => setFormData({...formData, data_vencimento: e.target.value})} />
                       </div>
                       <div>
                          <label className="block text-sm text-gray-400 mb-1">Dias Carência</label>
                          <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-emerald-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-900" 
                             disabled={formData.plano_tipo === 'teste'}
                             value={formData.plano_tipo === 'teste' ? '0' : (formData.dias_carencia ?? 0)} 
                             onChange={e => {
                                const digits = e.target.value.replace(/\D/g, '');
                                setFormData({...formData, dias_carencia: digits ? parseInt(digits, 10) : 0});
                             }} 
                          />
                       </div>
                       <div>
                          <label className="block text-sm text-gray-400 mb-1">Status</label>
                          <select className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-emerald-500 outline-none" 
                             value={formData.status_assinatura || 'ativo'} onChange={e => setFormData({...formData, status_assinatura: e.target.value})}>
                             <option value="ativo">Pago / Ativo</option>
                             <option value="inativo">Inativo</option>
                             <option value="bloqueado">Bloqueado</option>
                          </select>
                       </div>
                    </div>
                    
                    <div className="flex justify-end pt-2">
                       <button type="button" onClick={handleRenovarPagamento} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-bold flex items-center gap-2 text-sm transition-colors">
                          <CreditCard className="w-4 h-4"/> Informar Pagamento (Renovar Automático)
                       </button>
                    </div>
                 </div>

                 <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={() => { setIsCreating(false); setEditingTenant(null); }} className="px-6 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 font-bold transition-colors">
                       Cancelar
                    </button>
                    <button type="submit" className="px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all">
                       <Save className="w-5 h-5" /> Salvar Definitivo
                    </button>
                 </div>

              </form>
            </div>
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
