import useSWR from 'swr';
import api from '../services/api';
import type { TenantConfig } from '../types';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export function useClients() {
  const { data: tenants, mutate, error, isLoading } = useSWR<TenantConfig[]>('/config', fetcher, { refreshInterval: 5000 });

  const saveClient = async (payload: Partial<TenantConfig>, isEditing: boolean) => {
      // 1. Salva os dados de pagamento e configurações gerais no BD Legado
      let token = payload.instancia;
      if (isEditing) {
          await api.put(`/config/${payload.instancia}`, payload);
          token = payload.connect_token || payload.instancia;
      } else {
          const res = await api.post('/config', payload);
          token = res.data?.connect_token || payload.instancia;
      }

      // 2. Salva as configurações avançadas do WhatsApp na nova arquitetura (Fase 6)
      await api.put(`/whatsapp/instances/${payload.instancia}/settings`, {
          always_online: payload.sempre_online,
          reject_call: payload.rejeitar_chamadas,
          read_messages: payload.marcar_lidas,
          ignore_groups: payload.ignorar_grupos,
          ignore_status: payload.ignorar_status
      }).catch(err => console.error('Erro ao salvar settings da Instancia WhatsApp', err));

      mutate();
      return token;
  };

  const deleteClient = async (instancia: string) => {
      await api.delete(`/config/${instancia}`);
      mutate();
  };

  const toggleStatus = async (tenant: TenantConfig) => {
      const newStatus = tenant.status_assinatura === 'ativo' ? 'bloqueado' : 'ativo';
      await api.put(`/config/${tenant.instancia}`, { ...tenant, status_assinatura: newStatus });
      mutate();
      return newStatus;
  };

  const logoutWhatsapp = async (instancia: string) => {
      await api.post(`/config/${instancia}/logout`);
      mutate();
  };

  return {
    tenants: tenants || [],
    isLoading,
    error,
    mutate,
    saveClient,
    deleteClient,
    toggleStatus,
    logoutWhatsapp
  };
}
