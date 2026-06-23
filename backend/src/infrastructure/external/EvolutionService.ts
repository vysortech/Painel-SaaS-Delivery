import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import crypto from 'crypto';
import { GlobalSettingsRepository } from '../database/repositories/GlobalSettingsRepository';
import { ConfigRepository } from '../database/repositories/ConfigRepository';
import { logger } from '../../shared/logger';

// ==========================================
// Tipagens e Interfaces (Evolution Go)
// ==========================================

export interface EvolutionCredentials {
    url: string;
    globalApiKey: string;
}

export interface InstanceAdvancedSettings {
    rejectCall?: boolean;
    msgCall?: string;
    ignoreGroups?: boolean;
    alwaysOnline?: boolean;
    readMessages?: boolean;
    readStatus?: boolean;
    ignoreStatus?: boolean;
}

export interface ConnectInstanceResponse {
    instance: string;
    base64: string | null;
    code: string | null;
    pairingCode: string | null;
    error?: string;
    alreadyConnected?: boolean;
}

// Representa a resposta padrão do Golang com o envelope `{ message, data }`
export interface EvolutionApiResponse<T = any> {
    message?: string;
    error?: string;
    data?: T;
}

// ==========================================
// Configuração do Cliente HTTP
// ==========================================

const evolutionApi: AxiosInstance = axios.create({
    timeout: 15000, 
});

axiosRetry(evolutionApi, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error: AxiosError) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED';
    },
    onRetry: (retryCount, error, requestConfig) => {
        logger.warn({ retryCount, url: requestConfig.url, error: error.message }, 'Retrying Evolution API request...');
    }
});

// ==========================================
// Evolution Service
// ==========================================

export class EvolutionService {
    
    /**
     * Recupera as credenciais globais do banco de dados (Global API Key e URL).
     */
    private static async getCredentials(): Promise<EvolutionCredentials> {
        const settings = await GlobalSettingsRepository.get().catch(() => null);
        let url = settings?.evolution_api_url || process.env.EVOLUTION_API_URL;
        const globalApiKey = settings?.evolution_api_key || process.env.EVOLUTION_API_KEY;

        if (!url || !globalApiKey) {
            throw new Error('Evolution API URL ou API Key não configurados no painel ou .env.');
        }

        // Remove trailing slash if present
        if (url.endsWith('/')) {
            url = url.slice(0, -1);
        }

        return { url, globalApiKey };
    }

    /**
     * Gera os cabeçalhos padrão para a Evolution API.
     * @param token O token de autorização (Global API Key para AuthAdmin, ou Instance Token para Auth normal).
     * @param instanceId (Opcional) Nome da instância a ser trafegado no header `instance`.
     */
    private static buildHeaders(token: string, instanceId?: string): Record<string, string> {
        const headers: Record<string, string> = { 
            'apikey': token, 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' 
        };
        // A API Golang em alguns endpoints utiliza o header `instance` para autorização estendida
        if (instanceId) {
            headers['instance'] = instanceId;
        }
        return headers;
    }

    /**
     * Extrai de forma segura o objeto de dados de uma resposta que pode estar envelopada (padrão Go: { message, data: {...} }).
     */
    private static extractData<T>(responseData: any): T | null {
        if (!responseData) return null;
        if (responseData.data !== undefined) return responseData.data as T;
        return responseData as T;
    }

    /**
     * Sincroniza em tempo real o status de todas as instâncias puxando direto da API Evolution.
     * Útil quando o painel perde o webhook (ex: webhook enviado pro N8N).
     */
    public static async syncAllInstancesStatus(): Promise<Record<string, 'CONNECTED' | 'DISCONNECTED'>> {
        const { url, globalApiKey } = await this.getCredentials();
        try {
            const response = await evolutionApi.get<any>(
                `${url}/instance/all`,
                { headers: this.buildHeaders(globalApiKey) }
            );
            const instances = response.data?.data || response.data || [];
            const statusMap: Record<string, 'CONNECTED' | 'DISCONNECTED'> = {};
            
            for (const i of instances) {
                const name = i.name || i.instanceName;
                const isConnected = i.connected === true || i.connectionStatus === 'open' || i.state === 'open';
                statusMap[name] = isConnected ? 'CONNECTED' : 'DISCONNECTED';
            }
            return statusMap;
        } catch (error) {
            logger.warn('Falha ao sincronizar status em massa com Evolution');
            return {};
        }
    }

    /**
     * (AuthAdmin) Busca as informações da instância para recuperar o Instance Token real, garantindo 
     * a autorização correta em endpoints que não aceitam a Global API Key.
     */
    public static async getInstanceDetails(instanceName: string, skipCreation = false): Promise<{ token: string, uuid: string }> {
        const { url, globalApiKey } = await this.getCredentials();
        try {
            let instanceData: any = null;

            try {
                // Tenta buscar diretamente
                const res = await evolutionApi.get<EvolutionApiResponse>(
                    `${url}/instance/fetchInstances?instanceName=${instanceName}`, 
                    { headers: this.buildHeaders(globalApiKey) }
                );
                const instances = this.extractData<any[]>(res.data) || [];
                instanceData = instances.find((i: any) => i.name === instanceName || i.instance?.instanceName === instanceName);
            } catch (e: any) {
                // Se der 404, significa que a instância não existe. Vamos criar.
                if (e.response?.status !== 404) {
                    throw e; // se for outro erro, propaga
                }
            }
            
            if ((!instanceData || !instanceData.token) && !skipCreation) {
                logger.warn({ instanceName }, "Instância não encontrada na lista (ou 404). Tentando criar...");
                await this.createInstance(instanceName);
                
                // Fetch again
                const response2 = await evolutionApi.get<any>(
                    `${url}/instance/all`,
                    { headers: this.buildHeaders(globalApiKey) }
                );
                const instances2 = response2.data?.data || response2.data || [];
                instanceData = instances2.find((i: any) => i.name === instanceName || i.instanceName === instanceName);
                
                if (!instanceData || !instanceData.token) {
                    throw new Error('Instância não encontrada mesmo após tentativa de criação.');
                }
                
                // Fetch tenant from DB to apply advanced settings right after creation!
                try {
                    const tenant = await ConfigRepository.getByInstance(instanceName);
                    if (tenant) {
                        await this.updateAdvancedSettings(instanceName, {
                            alwaysOnline: tenant.sempre_online,
                            rejectCall: tenant.rejeitar_chamadas,
                            readMessages: tenant.marcar_lidas,
                            ignoreGroups: tenant.ignorar_grupos,
                            ignoreStatus: tenant.ignorar_status
                        });
                    }
                } catch(e) {
                    logger.warn({ instanceName }, "Não foi possível sincronizar as configurações avançadas após criar a instância.");
                }
            }
            
            if (!instanceData) throw new Error('Instância não existe e não foi possível criá-la.');

            return { token: instanceData.token, uuid: instanceData.id || instanceData.instanceId };
        } catch (error: any) {
            const status = error.response?.status;
            logger.error({ status, err: error.response?.data || error.message, instanceName }, "Falha ao buscar Instance Details.");
            throw new Error(`Falha ao recuperar token/uuid da instância ${instanceName}.`);
        }
    }

    // ─── 1. Criar Instância (POST /instance/create) ─────────
    public static async createInstance(instanceName: string): Promise<void> {
        const { url, globalApiKey } = await this.getCredentials();
        try {
            await evolutionApi.post<EvolutionApiResponse>(
                `${url}/instance/create`, 
                {
                    instanceName: instanceName,
                    name: instanceName,
                    instanceId: crypto.randomUUID(),
                    token: instanceName,
                }, 
                { headers: this.buildHeaders(globalApiKey) } // Rota administrativa exige AuthAdmin
            );
        } catch (error: any) {
            const errData = error.response?.data;
            const message = errData?.message || errData?.error || error.message || '';
            
            // Se a instância já existir, prosseguimos silenciosamente.
            if (typeof message === 'string' && !message.includes('already exists')) {
                logger.error({ err: errData || error.message, instanceName }, "Evolution-Go Create Error");
                const detail = errData ? JSON.stringify(errData) : error.message;
                throw new Error(`Falha ao criar instância Evolution-Go: ${detail}`);
            }
        }
    }

    // ─── 2. Configurações da Instância (PUT /instance/{id}/advanced-settings) ─
    public static async updateAdvancedSettings(instanceName: string, settings: InstanceAdvancedSettings): Promise<void> {
        const { url } = await this.getCredentials();
        try {
            const { token: instanceToken, uuid: instanceId } = await this.getInstanceDetails(instanceName, true);
            
            const payload = {
                rejectCall: settings.rejectCall ?? true,
                msgRejectCall: settings.msgCall ?? "Neste canal não aceitamos ligações. Por favor, envie uma mensagem de texto.",
                ignoreGroups: settings.ignoreGroups ?? false,
                alwaysOnline: settings.alwaysOnline ?? false,
                readMessages: settings.readMessages ?? false,
                ignoreStatus: settings.readStatus ?? settings.ignoreStatus ?? false,
            };

            await evolutionApi.put<EvolutionApiResponse>(
                `${url}/instance/${instanceId}/advanced-settings`, 
                payload, 
                { headers: { apikey: instanceToken } } // Go exige UUID na rota e apikey com o token da instancia
            );
        } catch (error: any) {
            logger.error({ err: error.response?.data || error.message, instanceName }, "Evolution-Go Update Settings Error");
        }
    }

    // ─── 3. Conectar / Gerar QR Code (POST /instance/connect) ──
    public static async connectInstance(instanceName: string, phone?: string): Promise<ConnectInstanceResponse> {
        const { url } = await this.getCredentials();
        
        // Webhook do n8n: puxa do banco (saas_global_settings) ou fallback para .env
        const settings = await GlobalSettingsRepository.get().catch(() => null);
        const n8nBase = settings?.n8n_webhook_url || process.env.N8N_WEBHOOK_URL || '';
        const webhookUrl = n8nBase ? `${n8nBase.replace(/\/+$/, '')}/${instanceName}` : '';
        
        try {
            // Buscamos o token dinamicamente. Essencial para instâncias legadas onde token !== instanceName
            const { token: instanceToken } = await this.getInstanceDetails(instanceName);

            // Evitar resetar a conexão se já estiver conectando
            const state = await this.getConnectionState(instanceName);
            if (state === 'open') {
                return { instance: instanceName, base64: null, code: null, pairingCode: null, alreadyConnected: true };
            }

            let connectData: any = {};
            // Se tiver telefone, forçamos o POST novamente para gerar o pairing code, mesmo se estiver 'connecting'
            if (state !== 'connecting' || phone) {
                try {
                    const queryParam = phone ? `?number=${phone}` : '';
                    logger.info({ instanceName, phone, url: `${url}/instance/connect${queryParam}` }, 'Calling POST /instance/connect');
                    const connectResponse = await evolutionApi.post<EvolutionApiResponse>(
                        `${url}/instance/connect${queryParam}`, 
                        {
                            webhook: webhookUrl,
                            webhookUrl: webhookUrl,
                            webhook_by_events: false,
                            webhook_events: ["MESSAGE", "CONNECTION_UPDATE", "MESSAGES_UPDATE", "QRCODE_UPDATED"],
                            subscribe: ["MESSAGE", "CONNECTION_UPDATE", "MESSAGES_UPDATE", "QRCODE_UPDATED"],
                            phone: phone || undefined,
                            number: phone || undefined
                        }, 
                        { headers: this.buildHeaders(instanceToken, instanceName) }
                    );
                    connectData = this.extractData<any>(connectResponse.data) || {};
                    logger.info({ instanceName, connectData }, 'Response from POST /instance/connect');
                } catch(e: any) {
                    logger.warn({ instanceName, status: e.response?.status }, "Falha no POST /instance/connect (pode já estar conectando)");
                }
            }
            
            // Evolution Go v1/v2 sometimes returns the raw session token in "code" (e.g. 2@kL...). Pairing code is short (8-9 chars).
            let base64: string | null = connectData.base64 || connectData.qrcode?.base64 || connectData.qrcode || null;
            let code: string | null = connectData.pairingCode || connectData.qrcode?.pairingCode || null;
            if (!code && connectData.code && typeof connectData.code === 'string' && connectData.code.length <= 15) code = connectData.code;

            // Se o connect não retornou o código de pareamento/QR, buscamos explicitamente em /instance/qr
            if (!base64 && !code) {
                try {
                    const qrRes = await evolutionApi.get<EvolutionApiResponse>(
                        `${url}/instance/qr`, 
                        { headers: this.buildHeaders(instanceToken, instanceName) }
                    );
                    const qrData = this.extractData<any>(qrRes.data) || {};
                    // Evolution Go retorna Qrcode e Code com primeira letra maiúscula!
                    base64 = qrData.base64 || qrData.qrcode || qrData.Qrcode || null;
                    if (!code) {
                        code = qrData.pairingCode || null;
                        if (!code && (qrData.code || qrData.Code)) {
                            const c = qrData.code || qrData.Code;
                            if (c && c.length <= 15) code = c;
                        }
                    }
                } catch(e) {
                    logger.warn({ instanceName }, "Falha ao buscar QR Code suplementar na rota GET /instance/qr");
                }
            }

            // Específico para Evolution Go: Forçar a buscar o pairing code na rota correta
            if (!code && phone) {
                try {
                    logger.info({ instanceName, phone }, 'Calling POST /instance/pair for Pairing Code');
                    const pairRes = await evolutionApi.post<EvolutionApiResponse>(
                        `${url}/instance/pair`, 
                        { phone }, 
                        { headers: this.buildHeaders(instanceToken, instanceName) }
                    );
                    const pairData = this.extractData<any>(pairRes.data) || {};
                    let newCode = pairData.PairingCode || pairData.pairingCode || pairData.qrcode?.pairingCode || pairData.qrcode?.PairingCode || null;
                    if (!newCode && (pairData.code || pairData.Code)) {
                        const c = pairData.code || pairData.Code;
                        if (c && typeof c === 'string' && c.length <= 15) newCode = c;
                    }
                    if (newCode) code = newCode;
                    logger.info({ instanceName, newCode }, 'Success POST /instance/pair');
                } catch(e: any) {
                    logger.warn({ instanceName, status: e.response?.status }, "Falha ao buscar Pairing Code na rota POST /instance/pair");
                }
            }

            return {
                instance: instanceName,
                base64,
                code,
                pairingCode: code,
            };
        } catch(error: any) {
            const status = error.response?.status;
            const detail = error.response?.data || error.message;

            if (status === 403) {
                logger.warn({ instanceName }, "Instância já encontra-se conectada (Status 403)");
                return { instance: instanceName, base64: null, code: null, pairingCode: null, alreadyConnected: true };
            }
            logger.error({ status, detail, instanceName }, "ERRO na operação de conexão com a Evolution-Go");
            return { instance: instanceName, base64: null, code: null, pairingCode: null, error: `Falha ao conectar: ${JSON.stringify(detail)}` };
        }
    }

    // ─── 4. Consulta do Estado da Conexão (GET /instance/status) ───────
    public static async getConnectionState(instanceName: string): Promise<string> {
        const { url } = await this.getCredentials();
        try {
            const { token: instanceToken } = await this.getInstanceDetails(instanceName);
            const res = await evolutionApi.get<EvolutionApiResponse>(
                `${url}/instance/status`, 
                { headers: this.buildHeaders(instanceToken, instanceName) }
            );
            const statusData = this.extractData<any>(res.data) || {};
            
            // Suporte ao Evolution Go v2 que retorna { Connected: boolean, LoggedIn: boolean }
            if (statusData.LoggedIn === true || statusData.Connected === true && statusData.LoggedIn === true) {
                return 'open';
            }
            if (statusData.Connected === true && statusData.LoggedIn === false) {
                return 'connecting';
            }

            // Status mapeados comuns: 'open', 'close', 'connecting'
            const st = statusData.state || statusData.instance?.state || statusData.connectionStatus || 'close';
            return String(st).toLowerCase();
        } catch (error: any) {
            return 'close';
        }
    }

    // ─── 5. Logout (DELETE /instance/logout ou DELETE /instance/delete) ──────────
    public static async logoutInstance(instanceName: string): Promise<void> {
        const { url, globalApiKey } = await this.getCredentials();
        try {
            const { token: instanceToken, uuid: instanceId } = await this.getInstanceDetails(instanceName);
            
            // Em Evolution Go v2, apenas 'logout' deixa a sessão presa em modo QR Code e impede a geração de novo Pairing Code.
            // A solução é deletar a instância completamente. Ela será recriada automaticamente no próximo 'connect'.
            await evolutionApi.delete<EvolutionApiResponse>(
                `${url}/instance/delete/${instanceId}`, 
                { headers: this.buildHeaders(globalApiKey) }
            );
        } catch (error: any) {
            logger.error({ err: error.response?.data || error.message, instanceName }, "Evolution-Go Logout/Delete Error");
        }
    }

    // ─── 6. Deletar Instância (DELETE /instance/delete/{instanceId}) ─
    public static async deleteInstance(instanceName: string): Promise<void> {
        const { url, globalApiKey } = await this.getCredentials();
        try {
            await evolutionApi.delete<EvolutionApiResponse>(
                `${url}/instance/delete/${instanceName}`, 
                { headers: this.buildHeaders(globalApiKey) } // Operação destrutiva requer AuthAdmin
            );
        } catch (error: any) {
            logger.error({ err: error.response?.data || error.message, instanceName }, "Evolution-Go Delete Error");
        }
    }

    // ─── 7. Restart Instância (POST /instance/forcereconnect/{instanceId}) ─
    public static async restartInstance(instanceName: string): Promise<void> {
        const { url, globalApiKey } = await this.getCredentials();
        try {
            await evolutionApi.post<EvolutionApiResponse>(
                `${url}/instance/forcereconnect/${instanceName}`, 
                { number: "" }, 
                { headers: this.buildHeaders(globalApiKey) } // Rota AuthAdmin
            );
        } catch (error: any) {
            logger.error({ err: error.response?.data || error.message, instanceName }, "Evolution-Go Restart Error");
        }
    }
}
