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
    evolution_api_url?: string;
    evolution_api_key?: string;
    n8n_webhook_url?: string;
}
