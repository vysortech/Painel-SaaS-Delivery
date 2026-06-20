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
    data_vencimento: Date | string | null;
    status_assinatura: string;
    plano_tipo: string;
    contexto_loja: string;
    dias_carencia: number;
    connect_token: string;
    status_conexao: 'PENDING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
}
