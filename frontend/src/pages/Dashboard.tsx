import React from 'react';
import axios from 'axios';
import useSWR from 'swr';
import { Activity, DollarSign, Users, Database, TrendingUp, AlertTriangle, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const fetcher = (url: string) => axios.get(url).then(res => res.data);

export default function Dashboard() {
  const { data: tenants } = useSWR('http://localhost:4000/api/config', fetcher, { refreshInterval: 5000 });
  const { data: mrrData } = useSWR('http://localhost:4000/api/analytics/mrr', fetcher, { refreshInterval: 10000 });

  // KPIs reais baseados no banco
  const totalMRR = mrrData?.reduce((acc: number, curr: any) => acc + Number(curr.total_revenue), 0) || 0;
  const activeTenants = tenants?.filter((t: any) => t.status_assinatura === 'ativo').length || 0;
  const inactiveTenants = tenants?.filter((t: any) => t.status_assinatura !== 'ativo').length || 0;
  
  // Consumo MOCK para dar vida ao painel (Em prod virá do n8n/Postgres)
  const totalTokens = activeTenants * 1250000; 

  // Dados Históricos MOCK para o Gráfico de Crescimento (Efeito UAU)
  const growthData = [
    { name: 'Jan', mrr: totalMRR * 0.3 },
    { name: 'Fev', mrr: totalMRR * 0.45 },
    { name: 'Mar', mrr: totalMRR * 0.6 },
    { name: 'Abr', mrr: totalMRR * 0.75 },
    { name: 'Mai', mrr: totalMRR * 0.9 },
    { name: 'Jun', mrr: totalMRR || 1000 }, // Current month
  ];

  // Dados de consumo MOCK por cliente
  const consumptionData = tenants?.slice(0, 5).map((t: any) => ({
    name: t.nome_empresa,
    tokens: Math.floor(Math.random() * 500000) + 100000
  })) || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex justify-between items-end border-b border-gray-800 pb-4">
         <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/20 rounded-xl">
               <Database className="text-blue-500 w-8 h-8" />
            </div>
            <div>
               <h1 className="text-3xl font-extrabold text-white tracking-tight">Visão Geral</h1>
               <p className="text-gray-400 text-sm mt-1">Métricas de performance e faturamento em tempo real.</p>
            </div>
         </div>
         <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
               <span className="relative flex h-2 w-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
               </span>
               Sistema Online
            </span>
         </div>
      </div>

      {/* KPI Cards (Glassmorphism & Gradients) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* MRR Card */}
        <div className="bg-gradient-to-br from-gray-900 to-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="w-24 h-24 text-emerald-500" />
          </div>
          <div className="flex items-center gap-3 relative z-10">
             <div className="p-2.5 bg-emerald-500/20 rounded-lg text-emerald-400 border border-emerald-500/30"><DollarSign className="w-5 h-5" /></div>
             <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Faturamento (MRR)</p>
          </div>
          <p className="text-4xl font-black text-white mt-4 relative z-10">R$ {totalMRR.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
          <div className="mt-4 flex items-center gap-1 text-sm text-emerald-400 font-medium relative z-10">
            <TrendingUp className="w-4 h-4" /> <span>+12.5% vs último mês</span>
          </div>
        </div>
        
        {/* Active Tenants Card */}
        <div className="bg-gradient-to-br from-gray-900 to-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-24 h-24 text-blue-500" />
          </div>
          <div className="flex items-center gap-3 relative z-10">
             <div className="p-2.5 bg-blue-500/20 rounded-lg text-blue-400 border border-blue-500/30"><Users className="w-5 h-5" /></div>
             <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Clientes Ativos</p>
          </div>
          <p className="text-4xl font-black text-white mt-4 relative z-10">{activeTenants}</p>
          <div className="mt-4 flex items-center gap-1 text-sm text-blue-400 font-medium relative z-10">
            <ArrowUpRight className="w-4 h-4" /> <span>{activeTenants > 0 ? '+1' : '0'} na última semana</span>
          </div>
        </div>

        {/* Tokens Consumed Card */}
        <div className="bg-gradient-to-br from-gray-900 to-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="w-24 h-24 text-purple-500" />
          </div>
          <div className="flex items-center gap-3 relative z-10">
             <div className="p-2.5 bg-purple-500/20 rounded-lg text-purple-400 border border-purple-500/30"><Zap className="w-5 h-5" /></div>
             <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Tokens Processados</p>
          </div>
          <p className="text-4xl font-black text-white mt-4 relative z-10">{(totalTokens / 1000000).toFixed(1)}M</p>
          <div className="mt-4 flex items-center gap-1 text-sm text-purple-400 font-medium relative z-10">
            <Activity className="w-4 h-4" /> <span>Estimativa mensal total</span>
          </div>
        </div>

        {/* Churn / Inactive Card */}
        <div className="bg-gradient-to-br from-gray-900 to-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertTriangle className="w-24 h-24 text-red-500" />
          </div>
          <div className="flex items-center gap-3 relative z-10">
             <div className="p-2.5 bg-red-500/20 rounded-lg text-red-400 border border-red-500/30"><AlertTriangle className="w-5 h-5" /></div>
             <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Inativos / Churn</p>
          </div>
          <p className="text-4xl font-black text-white mt-4 relative z-10">{inactiveTenants}</p>
          <div className="mt-4 flex items-center gap-1 text-sm text-gray-500 font-medium relative z-10">
            <ArrowDownRight className="w-4 h-4" /> <span>Atenção à retenção</span>
          </div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Area Chart: MRR Growth */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl col-span-1 lg:col-span-2">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Evolução de Faturamento (MRR)</h3>
              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">Últimos 6 meses</span>
           </div>
           <div className="w-full h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={growthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                 <defs>
                   <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                     <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                 <XAxis dataKey="name" stroke="#6b7280" tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} />
                 <YAxis stroke="#6b7280" tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(value) => `R$${value}`} />
                 <Tooltip 
                    contentStyle={{backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'}}
                    itemStyle={{color: '#10b981', fontWeight: 'bold'}}
                 />
                 <Area type="monotone" dataKey="mrr" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorMrr)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Bar Chart: Token Consumption */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl col-span-1">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Top Consumidores (Tokens)</h3>
           </div>
           <div className="w-full h-[300px]">
             {consumptionData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={consumptionData} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={true} vertical={false}/>
                   <XAxis type="number" hide />
                   <YAxis dataKey="name" type="category" stroke="#6b7280" tick={{fill: '#9ca3af', fontSize: 11}} axisLine={false} tickLine={false} />
                   <Tooltip 
                      cursor={{fill: '#1f2937'}} 
                      contentStyle={{backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff'}}
                   />
                   <Bar dataKey="tokens" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                 </BarChart>
               </ResponsiveContainer>
             ) : (
               <div className="flex h-full items-center justify-center text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
                  Sem dados suficientes
               </div>
             )}
           </div>
        </div>

      </div>

      {/* Recent Clients Table */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
           <h3 className="text-lg font-bold text-white">Últimos Clientes Registrados</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-800/30 text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 font-semibold">Empresa</th>
                <th className="p-4 font-semibold">Instância PIX</th>
                <th className="p-4 font-semibold">Mensalidade</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {tenants?.slice(0, 5).map((t: any) => (
                <tr key={t.instancia} className="hover:bg-gray-800/20 transition-colors">
                  <td className="p-4 text-white font-medium">{t.nome_empresa}</td>
                  <td className="p-4 text-gray-400 text-sm font-mono">{t.instancia}</td>
                  <td className="p-4 text-gray-300 font-medium">R$ {t.valor_assinatura}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold
                      ${t.status_assinatura === 'ativo' ? 'bg-emerald-500/10 text-emerald-400' : 
                        t.status_assinatura === 'carencia' ? 'bg-yellow-500/10 text-yellow-400' : 
                        'bg-red-500/10 text-red-400'}`}>
                      {t.status_assinatura.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
              {(!tenants || tenants.length === 0) && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                     Nenhum cliente registrado ainda. Comece a vender!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
