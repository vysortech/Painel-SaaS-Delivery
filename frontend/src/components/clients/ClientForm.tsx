import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageCircle, Bot, CreditCard, Save } from 'lucide-react';
import type { TenantConfig } from '../../types';
import { TagInput } from '../common/TagInput';

interface ClientFormProps {
    initialData?: TenantConfig | null;
    onClose: () => void;
    onSave: (payload: any, isEditing: boolean) => Promise<void>;
}

const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (!raw) return '';
    if (raw.length <= 2) return `(${raw}`;
    if (raw.length <= 7) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
};

const getLocalDateString = (offsetDays = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

export const ClientForm: React.FC<ClientFormProps> = ({ initialData, onClose, onSave }) => {
    const isEditing = !!initialData;
    const [formData, setFormData] = useState<any>({});
    const [telefones, setTelefones] = useState<string[]>([]);
    const [botoesTempo, setBotoesTempo] = useState<string[]>([]);

    useEffect(() => {
        if (isEditing && initialData) {
            setFormData({ 
                ...initialData, 
                data_vencimento: initialData.data_vencimento?.split('T')[0] || '', 
                plano_tipo: initialData.plano_tipo || 'recorrente', 
                contexto_loja: initialData.contexto_loja || '', 
                dias_carencia: initialData.dias_carencia || 0 
            });
            setTelefones(initialData.telefone_admin ? initialData.telefone_admin.split(',').map((t: string) => t.trim()).filter(Boolean) : []);
            setBotoesTempo(initialData.botoes_tempo ? initialData.botoes_tempo.split(',').map((t: string) => t.trim()).filter(Boolean) : []);
        } else {
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
        }
    }, [initialData, isEditing]);

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

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...formData,
            telefone_admin: telefones.join(','),
            botoes_tempo: botoesTempo.join(',')
        };
        await onSave(payload, isEditing);
    };

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-6 flex items-center gap-4">
               <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 p-2 rounded-full">
                  <ArrowLeft className="w-5 h-5" />
               </button>
               <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">{isEditing ? 'Editar Canal de Atendimento' : 'Configure seu novo canal para começar a receber mensagens'}</h2>
                  <p className="text-sm text-gray-400 mt-1">{isEditing ? 'Atualize as configurações do cliente.' : 'Preencha os dados abaixo para provisionar um novo Tenant no painel SaaS.'}</p>
               </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-6 pb-20">
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
                                   Nome do Canal (Instância) <span className="text-red-500">*</span>
                               </label>
                               <input required disabled={isEditing} type="text" 
                                  className="w-full bg-[#131316] border border-gray-800 rounded-lg p-3 text-gray-400 outline-none focus:border-[#0ea5e9]"
                                  value={formData.instancia || ''} 
                                  onChange={e => setFormData({...formData, instancia: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')})} 
                                  placeholder="Digite o nome da instância (ex: pizzaria_filial1)"
                               />
                               <p className="text-xs text-gray-500 mt-2">Nome usado internamente pela API (sem espaços ou caracteres especiais).</p>
                           </div>
                       </div>

                       <div>
                           <label className="flex items-center justify-between text-sm font-medium text-gray-300 mb-1">
                               Número do WhatsApp Principal <span className="text-red-500">*</span>
                           </label>
                           <div className="flex">
                               <span className="bg-[#131316] border border-gray-800 border-r-0 rounded-l-lg px-4 py-3 text-gray-400 font-medium text-sm flex items-center justify-center whitespace-nowrap gap-2">
                                  <span className="text-lg">🇧🇷</span> +55
                               </span>
                               <input required type="text" 
                                  className="w-full bg-[#18181b] border border-gray-700/50 rounded-r-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder-gray-600"
                                  placeholder="(11) 99999-9999"
                                  value={formatPhone(formData.telefone_whatsapp?.replace(/^55/, '') || '')}
                                  onChange={e => {
                                     const val = e.target.value.replace(/\D/g, '');
                                     setFormData({...formData, telefone_whatsapp: val ? '55' + val.slice(0, 11) : ''});
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
                              placeholder="Ex: (11) 99999-9999" 
                              tags={telefones} 
                              setTags={setTelefones} 
                              isNumericOnly={true}
                              isPhone={true}
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
                                  if (!isEditing) {
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
                     <Save className="w-5 h-5" /> {isEditing ? 'Salvar Configurações' : 'Criar Cliente (Tenant)'}
                  </button>
               </div>
            </form>
        </div>
    );
};
