import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Bot, Key, Database } from 'lucide-react';

export default function Settings() {
  const [formData, setFormData] = useState({
    prompt_cliente: '',
    prompt_admin: '',
    modelo_ia_cliente: 'google/gemma-4-31b-it',
    modelo_ia_admin: 'deepseek/deepseek-v4-flash',
    custo_token_entrada_cliente: 0.0001,
    custo_token_saida_cliente: 0.0001,
    custo_token_entrada_admin: 0.0001,
    custo_token_saida_admin: 0.0001
  });

  useEffect(() => {
    axios.get('/api/settings')
      .then(res => {
        if (res.data) {
          setFormData({
            ...formData,
            ...res.data
          });
        }
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put('/api/settings', formData);
      alert('Configurações globais salvas com sucesso!');
    } catch (err) {
      alert('Erro ao salvar as configurações.');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      
      <div className="flex justify-between items-center border-b border-gray-800 pb-4">
        <div>
           <h2 className="text-2xl font-bold text-white">Configuração Global do Sistema</h2>
           <p className="text-gray-400 text-sm mt-1">Defina os parâmetros mestre. O n8n lerá estes dados diretamente do banco de dados.</p>
        </div>
        <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all">
          <Save className="w-5 h-5" /> Salvar Tudo
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Bloco: IA Cliente */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-xl space-y-6">
          <h3 className="text-xl font-semibold text-emerald-400 flex items-center gap-2 border-b border-gray-800 pb-2">
            <Bot className="w-5 h-5" /> IA Cliente (Atendimento Final)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="md:col-span-1 space-y-4">
               <div>
                 <label className="block text-sm text-gray-400 mb-2">Modelo de IA Padrão</label>
                 <div className="relative">
                   <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                   <input 
                     type="text" className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:border-emerald-500 outline-none"
                     placeholder="Ex: google/gemma-4-31b-it"
                     value={formData.modelo_ia_cliente || ''} onChange={e => setFormData({...formData, modelo_ia_cliente: e.target.value})}
                   />
                 </div>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm text-gray-400 mb-1">Custo Token Entrada (U$)</label>
                   <input type="number" step="0.0000001" className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:border-emerald-500 outline-none"
                     value={formData.custo_token_entrada_cliente || 0} onChange={e => setFormData({...formData, custo_token_entrada_cliente: parseFloat(e.target.value)})} />
                 </div>
                 <div>
                   <label className="block text-sm text-gray-400 mb-1">Custo Token Saída (U$)</label>
                   <input type="number" step="0.0000001" className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:border-emerald-500 outline-none"
                     value={formData.custo_token_saida_cliente || 0} onChange={e => setFormData({...formData, custo_token_saida_cliente: parseFloat(e.target.value)})} />
                 </div>
               </div>
             </div>

             <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-2">Prompt Mestre da IA Cliente</label>
                <textarea 
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white font-mono text-sm h-48 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-y"
                  placeholder="Você é o assistente virtual da loja..."
                  value={formData.prompt_cliente || ''} onChange={e => setFormData({...formData, prompt_cliente: e.target.value})}
                />
             </div>
          </div>
        </div>

        {/* Bloco: IA Admin */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-xl space-y-6">
          <h3 className="text-xl font-semibold text-purple-400 flex items-center gap-2 border-b border-gray-800 pb-2">
            <Key className="w-5 h-5" /> IA Admin (Marketing / Interno)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="md:col-span-1 space-y-4">
               <div>
                 <label className="block text-sm text-gray-400 mb-2">Modelo de IA Padrão</label>
                 <div className="relative">
                   <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                   <input 
                     type="text" className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:border-purple-500 outline-none"
                     placeholder="Ex: deepseek/deepseek-v4-flash"
                     value={formData.modelo_ia_admin || ''} onChange={e => setFormData({...formData, modelo_ia_admin: e.target.value})}
                   />
                 </div>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm text-gray-400 mb-1">Custo Token Entrada (U$)</label>
                   <input type="number" step="0.0000001" className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:border-purple-500 outline-none"
                     value={formData.custo_token_entrada_admin || 0} onChange={e => setFormData({...formData, custo_token_entrada_admin: parseFloat(e.target.value)})} />
                 </div>
                 <div>
                   <label className="block text-sm text-gray-400 mb-1">Custo Token Saída (U$)</label>
                   <input type="number" step="0.0000001" className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:border-purple-500 outline-none"
                     value={formData.custo_token_saida_admin || 0} onChange={e => setFormData({...formData, custo_token_saida_admin: parseFloat(e.target.value)})} />
                 </div>
               </div>
             </div>

             <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-2">Prompt Mestre da IA Admin</label>
                <textarea 
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white font-mono text-sm h-48 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-y"
                  placeholder="Você atende os comandos do dono da loja..."
                  value={formData.prompt_admin || ''} onChange={e => setFormData({...formData, prompt_admin: e.target.value})}
                />
             </div>
          </div>
        </div>

      </form>
    </div>
  );
}
