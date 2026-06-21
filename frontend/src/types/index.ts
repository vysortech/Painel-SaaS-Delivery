export interface TenantConfig {
    instancia: string;
    nome_empresa: string;
    nome_admin: string;
    telefone_admin: string;
    chave_pix: string;
    nome_pix: string;
    modelo_ia_cliente: string;
    modelo_ia_admin: string;
    nome_atendente: string;
    botoes_tempo: string;
    valor_assinatura: number;
    data_vencimento: string | null;
    status_assinatura: string;
    plano_tipo: string;
    contexto_loja: string;
    dias_carencia: number;
    connect_token?: string;
    status_conexao?: 'PENDING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
    sempre_online?: boolean;
    rejeitar_chamadas?: boolean;
    marcar_lidas?: boolean;
    ignorar_grupos?: boolean;
    ignorar_status?: boolean;
}

export interface User {
    id: number;
    nome: string;
    username: string;
    created_at: string;
}

export interface GlobalSettings {
    id: number;
    prompt_cliente: string;
    prompt_admin: string;
    modelo_ia_cliente: string;
    modelo_ia_admin: string;
    custo_token_entrada_cliente: number;
    custo_token_saida_cliente: number;
    custo_token_entrada_admin: number;
    custo_token_saida_admin: number;
}

export interface AuthResponse {
    token: string;
    username: string;
    nome: string;
}

export interface EvolutionQrResponse {
    connected: boolean;
    status?: string;
    base64?: string;
    instanceName?: string;
    error?: string;
}

export interface AnalyticsData {
    status_assinatura: string;
    count: string;
    total_revenue: string;
}
