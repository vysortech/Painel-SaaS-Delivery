export type InstanceStatus = 
  | 'PENDING' 
  | 'CONNECTING' 
  | 'CONNECTED' 
  | 'DISCONNECTED' 
  | 'LOGGED_OUT' 
  | 'ERROR' 
  | 'DISABLED' 
  | 'DELETED';

export interface WhatsappInstance {
  id: string; // UUID
  tenant_id: string; // Referência à tabela configuracoes
  instance_name: string;
  instance_token: string;
  phone: string | null;
  status: InstanceStatus;
  active: boolean;
  last_connection_at: Date | null;
  last_disconnect_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface WhatsappInstanceSettings {
  id: string; // UUID
  instance_id: string; // Referência a whatsapp_instances
  always_online: boolean;
  reject_call: boolean;
  read_messages: boolean;
  ignore_groups: boolean;
  ignore_status: boolean;
  created_at: Date;
  updated_at: Date;
}
