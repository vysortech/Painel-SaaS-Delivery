import useSWR from 'swr';
import api from '../services/api';
import type { TenantConfig } from '../types';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export function useClients() {
  const { data: tenants, mutate, error, isLoading } = useSWR<TenantConfig[]>('/config', fetcher, { refreshInterval: 5000 });

  const saveClient = async (payload: Partial<TenantConfig>, isEditing: boolean) => {
      if (isEditing) {
          await api.put(`/config/${payload.instancia}`, payload);
          return payload.connect_token || payload.instancia;
      } else {
          const res = await api.post('/config', payload);
          return res.data?.connect_token || payload.instancia;
      }
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
