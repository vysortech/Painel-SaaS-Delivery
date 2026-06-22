import axios, { AxiosInstance, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import { GlobalSettingsRepository } from '../database/repositories/GlobalSettingsRepository';
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
        const url = settings?.evolution_api_url || process.env.EVOLUTION_API_URL;
        const globalApiKey = settings?.evolution_api_key || process.env.EVOLUTION_API_KEY;

        if (!url || !globalApiKey) {
            throw new Error('Evolution API URL ou API Key não configurados no painel ou .env.');
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
     * (AuthAdmin) Busca as informações da instância para recuperar o Instance Token real, garantindo 
     * a autorização correta em endpoints que não aceitam a Global API Key.
     */
    public static async getInstanceToken(instanceName: string): Promise<string> {
        const { url, globalApiKey } = await this.getCredentials();
        try {
            const response = await evolutionApi.get<EvolutionApiResponse>(
                `${url}/instance/info/${instanceName}`,
                { headers: this.buildHeaders(globalApiKey) }
            );
            const instanceData = this.extractData<any>(response.data);
            if (!instanceData || !instanceData.token) {
                throw new Error('Instância localizada, mas sem token válido.');
            }
            return instanceData.token;
        } catch (error: any) {
            const status = error.response?.status;
            logger.error({ status, err: error.response?.data || error.message, instanceName }, "Falha ao buscar Instance Token.");
            throw new Error(`Falha ao recuperar token da instância ${instanceName}. Instância não existe ou Global API Key incorreta.`);
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
                    instanceId: instanceName,
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
            const instanceToken = await this.getInstanceToken(instanceName);
            
            const payload = {
                rejectCall: settings.rejectCall ?? true,
                msgRejectCall: settings.msgCall ?? "Neste canal não aceitamos ligações. Por favor, envie uma mensagem de texto.",
                ignoreGroups: settings.ignoreGroups ?? false,
                alwaysOnline: settings.alwaysOnline ?? false,
                readMessages: settings.readMessages ?? false,
                ignoreStatus: settings.readStatus ?? settings.ignoreStatus ?? false,
            };

            await evolutionApi.put<EvolutionApiResponse>(
                `${url}/instance/${instanceName}/advanced-settings`, 
                payload, 
                { headers: this.buildHeaders(instanceToken) } // Requer Auth normal (Token da Instância)
            );
        } catch (error: any) {
            logger.error({ err: error.response?.data || error.message, instanceName }, "Evolution-Go Update Settings Error");
        }
    }

    // ─── 3. Conectar / Gerar QR Code (POST /instance/connect) ──
    public static async connectInstance(instanceName: string, phone?: string): Promise<ConnectInstanceResponse> {
        const { url } = await this.getCredentials();
        const baseUrl = process.env.BACKEND_URL || process.env.FRONTEND_URL || 'https://food.vysortech.app.br';
        const webhookUrl = `${baseUrl}/api/whatsapp/webhooks`;
        
        try {
            // Buscamos o token dinamicamente. Essencial para instâncias legadas onde token !== instanceName
            const instanceToken = await this.getInstanceToken(instanceName);

            const connectResponse = await evolutionApi.post<EvolutionApiResponse>(
                `${url}/instance/connect`, 
                {
                    webhookUrl,
                    phone: phone || undefined,
                    subscribe: ["MESSAGE", "CONNECTION_UPDATE", "MESSAGES_UPDATE"]
                }, 
                { headers: this.buildHeaders(instanceToken, instanceName) }
            );

            const connectData = this.extractData<any>(connectResponse.data) || {};
            
            // O endpoint /connect na Go API nem sempre retorna o base64 (geralmente apenas jid e webhook)
            let base64: string | null = connectData.base64 || connectData.qrcode || null;
            const code: string | null = connectData.pairingCode || connectData.code || null;

            // Se o connect não retornou o código de pareamento/QR, buscamos explicitamente em /instance/qr
            if (!base64 && !code) {
                try {
                    const qrRes = await evolutionApi.get<EvolutionApiResponse>(
                        `${url}/instance/qr`, 
                        { headers: this.buildHeaders(instanceToken, instanceName) }
                    );
                    const qrData = this.extractData<any>(qrRes.data) || {};
                    base64 = qrData.base64 || qrData.qrcode || null;
                } catch(e) {
                    logger.warn({ instanceName }, "Falha ao buscar QR Code suplementar na rota GET /instance/qr");
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
            const instanceToken = await this.getInstanceToken(instanceName);
            const res = await evolutionApi.get<EvolutionApiResponse>(
                `${url}/instance/status`, 
                { headers: this.buildHeaders(instanceToken, instanceName) }
            );
            const statusData = this.extractData<any>(res.data) || {};
            // Status mapeados comuns: 'open', 'close', 'connecting'
            return statusData.state || 'close';
        } catch (error: any) {
            return 'close';
        }
    }

    // ─── 5. Logout (DELETE /instance/logout) ──────────
    public static async logoutInstance(instanceName: string): Promise<void> {
        const { url } = await this.getCredentials();
        try {
            const instanceToken = await this.getInstanceToken(instanceName);
            await evolutionApi.delete<EvolutionApiResponse>(
                `${url}/instance/logout`, 
                { headers: this.buildHeaders(instanceToken, instanceName) }
            );
        } catch (error: any) {
            logger.error({ err: error.response?.data || error.message, instanceName }, "Evolution-Go Logout Error");
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
