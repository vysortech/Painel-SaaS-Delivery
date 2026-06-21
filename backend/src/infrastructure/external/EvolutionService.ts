import axios from 'axios';
import axiosRetry from 'axios-retry';
import { GlobalSettingsRepository } from '../database/repositories/GlobalSettingsRepository';
import { logger } from '../../shared/logger';

// Instância dedicada para Evolution com Timeout de 15s
const evolutionApi = axios.create({
    timeout: 15000, 
});

// Configura 3 retentativas com Exponential Backoff
axiosRetry(evolutionApi, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED';
    },
    onRetry: (retryCount, error, requestConfig) => {
        logger.warn({ retryCount, url: requestConfig.url, error: error.message }, 'Retrying Evolution API request...');
    }
});

export class EvolutionService {
    private static async getCredentials() {
        const settings = await GlobalSettingsRepository.get().catch(() => null);
        const url = settings?.evolution_api_url || process.env.EVOLUTION_API_URL;
        const key = settings?.evolution_api_key || process.env.EVOLUTION_API_KEY;
        if (!url || !key) {
            throw new Error('Evolution API URL ou API Key não configurados.');
        }
        return { url, key };
    }

    public static async createInstance(instancia: string): Promise<void> {
        const { url, key } = await this.getCredentials();
        try {
            await evolutionApi.post(`${url}/instance/create`, {
                instanceName: instancia,
                name: instancia,
                integration: "WHATSAPP-BAILEYS",
                token: instancia,
                qrcode: true
            }, {
                headers: { 'apikey': key, 'Content-Type': 'application/json' }
            });

            // Configura os Webhooks Globais para esta instância apontando para o nosso Backend
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            await evolutionApi.post(`${url}/webhook/set/${instancia}`, {
                webhook: {
                    enabled: true,
                    url: `${backendUrl}/api/whatsapp/webhooks`,
                    webhookByEvents: false,
                    webhookBase64: true, // Necessário para QR Code base64 no webhook
                    events: [
                        "QRCODE_UPDATED",
                        "CONNECTION_UPDATE",
                        "MESSAGES_UPSERT",
                        "MESSAGES_UPDATE",
                        "SEND_MESSAGE",
                        "CALL"
                    ]
                }
            }, { headers: { 'apikey': key } });
        } catch (e: any) {
            logger.error({ err: e.response?.data || e.message, instancia }, "Evolution Create Error");
            throw e;
        }
    }

    public static async connectInstance(instancia: string, phone?: string): Promise<any> {
        const { url, key } = await this.getCredentials();
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
        const WEBHOOK_URL = `${backendUrl}/api/whatsapp/webhooks`;
        
        // Assegura configuração de Webhook
        try {
            await evolutionApi.post(`${url}/webhook/set/${instancia}`, {
                webhook: {
                    enabled: true,
                    url: WEBHOOK_URL,
                    webhookByEvents: false,
                    webhookBase64: true,
                    events: ["QRCODE_UPDATED", "MESSAGES_UPSERT", "CONNECTION_UPDATE"]
                }
            }, { headers: { 'apikey': key } }).catch(() => {});
        } catch(e) {}

        let connectResponse;
        try {
            // Tenta conectar no padrão Evolution API Classic (v1/v2 NodeJS)
            let urlStr = `${url}/instance/connect/${instancia}`;
            if (phone) urlStr += `?phone=${phone}`;
            
            connectResponse = await evolutionApi.get(urlStr, {
                headers: { 'apikey': key }
            });
        } catch (err: any) {
            // Se retornar 404 ou 401, significa que é a Evolution Go!
            if (err.response?.status === 404 || err.response?.status === 401 || err.response?.status === 400) {
                logger.info("Detectado Evolution Go, conectando por rota alternativa...");
                
                try {
                    await evolutionApi.post(`${url}/instance/connect`, {
                        webhookUrl: WEBHOOK_URL
                    }, { headers: { 'apikey': instancia } });
                    
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch(e) {}

                try {
                    connectResponse = await evolutionApi.get(`${url}/instance/qr?instance=${instancia}`, {
                        headers: { 'apikey': instancia }
                    });
                } catch(qrErr: any) {
                    logger.error({ err: qrErr.response?.data || qrErr.message }, "Erro ao buscar QR da Evolution Go");
                    throw qrErr;
                }
            } else {
                throw err;
            }
        }

        let finalData: any = connectResponse?.data || {};
        if (!finalData.base64) {
            if (finalData.qrcode?.base64) finalData.base64 = finalData.qrcode.base64;
            else if (finalData.qrcode) finalData.base64 = finalData.qrcode;
            else if (finalData.data?.qrcode) finalData.base64 = finalData.data.qrcode;
            else if (finalData.data?.base64) finalData.base64 = finalData.data.base64;
        }
        
        if (!finalData.pairingCode) {
            finalData.pairingCode = finalData.code || finalData.data?.code || finalData.data?.PairingCode;
        }

        return finalData;
    }

    public static async getPairingCode(instancia: string, phone: string): Promise<string | null> {
        const { url } = await this.getCredentials();
        try {
            const pairRes = await evolutionApi.post(`${url}/instance/pair`, { phone }, { 
                headers: { 'apikey': instancia } 
            });
            return pairRes.data?.data?.PairingCode || pairRes.data?.PairingCode || pairRes.data?.code || null;
        } catch (e: any) {
            logger.error({ err: e.response?.data || e.message, instancia }, "Evolution Pairing Code Error");
            return null;
        }
    }

    public static async logoutInstance(instancia: string): Promise<void> {
        const { url, key } = await this.getCredentials();
        try {
            await evolutionApi.delete(`${url}/instance/logout/${instancia}`, {
                headers: { 'apikey': key }
            });
        } catch (e: any) {
            logger.error({ err: e.response?.data || e.message, instancia }, "Evolution Logout Error");
        }
    }

    public static async deleteInstance(instancia: string): Promise<void> {
        const { url, key } = await this.getCredentials();
        try {
            await evolutionApi.delete(`${url}/instance/delete/${instancia}`, {
                headers: { 'apikey': key }
            });
        } catch (e: any) {
            logger.error({ err: e.response?.data || e.message, instancia }, "Evolution Delete Error");
        }
    }

    public static async updateAdvancedSettings(instancia: string, settings: any): Promise<void> {
        const { url, key } = await this.getCredentials();
        try {
            await evolutionApi.put(`${url}/instance/${instancia}/advanced-settings`, settings, {
                headers: { 'apikey': key, 'Content-Type': 'application/json' }
            });
        } catch (e: any) {
            logger.error({ err: e.response?.data || e.message, instancia }, "Evolution Update Settings Error");
        }
    }
}
