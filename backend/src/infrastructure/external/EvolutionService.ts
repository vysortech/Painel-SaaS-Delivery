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
        const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:4000/api/whatsapp/webhooks';
        
        let isEvoGo = false;
        let evoGoState = '';

        // 1. Check Evo Go status directly using instance token
        try {
            const statusRes = await evolutionApi.get(`${url}/instance/status`, {
                headers: { 'apikey': instancia }
            });
            isEvoGo = true;
            evoGoState = statusRes.data?.instance?.state || statusRes.data?.state || '';
        } catch (e) {}

        if (!isEvoGo) {
            await this.createInstance(instancia).catch(() => {});
            
            try {
                const statusRes = await evolutionApi.get(`${url}/instance/status`, {
                    headers: { 'apikey': instancia }
                });
                isEvoGo = true;
                evoGoState = statusRes.data?.instance?.state || statusRes.data?.state || '';
            } catch (e) {}
        }

        if (isEvoGo) {
            if (evoGoState === 'open' || evoGoState === 'CONNECTED') {
                return { connected: true, status: 'CONNECTED' };
            }

            if (evoGoState !== 'connecting') {
                try {
                    await evolutionApi.post(`${url}/webhook/set/${instancia}`, {
                        webhook: {
                            enabled: true,
                            url: WEBHOOK_URL,
                            webhookByEvents: false,
                            events: ["QRCODE_UPDATED", "MESSAGES_UPSERT", "CONNECTION_UPDATE"]
                        }
                    }, { headers: { 'apikey': key } }).catch(() => {});

                    await evolutionApi.post(`${url}/instance/connect`, {
                        webhookUrl: WEBHOOK_URL
                    }, { headers: { 'apikey': instancia } });
                    
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch(e: any) {
                    logger.error({ err: e.response?.data || e.message, instancia }, "Evolution Go Connect Error");
                }
            }

            let result: any = { base64: null, pairingCode: null, status: evoGoState.toUpperCase() };
            
            try {
                const qrRes = await evolutionApi.get(`${url}/instance/qr`, { 
                    headers: { 'apikey': instancia } 
                });
                result.base64 = qrRes.data?.data?.Qrcode || qrRes.data?.Qrcode || qrRes.data?.base64 || null;
            } catch(e) {}

            return result;
        }

        // --- EVOLUTION API (CLASSIC) FALLBACK LOGIC ---
        try {
            try {
                await evolutionApi.post(`${url}/webhook/set/${instancia}`, {
                    webhook: {
                        enabled: true,
                        url: WEBHOOK_URL,
                        webhookByEvents: false,
                        events: ["QRCODE_UPDATED", "MESSAGES_UPSERT", "CONNECTION_UPDATE"]
                    }
                }, { headers: { 'apikey': key } }).catch(() => {});
            } catch(e) {}

            let urlStr = `${url}/instance/connect/${instancia}`;
            if (phone) urlStr += `?phone=${phone}`;
            
            const connectResponse = await evolutionApi.get(urlStr, {
                headers: { 'apikey': key }
            });

            let finalData: any = {};
            finalData.base64 = connectResponse.data?.base64 || connectResponse.data?.qrcode?.base64 || null;
            finalData.pairingCode = connectResponse.data?.pairingCode || connectResponse.data?.code || null;
            
            return finalData;

        } catch (finalErr: any) {
            logger.error({ err: finalErr.response?.data || finalErr.message, instancia }, "Evolution API Classic Error");
            return { base64: null, error: "Falha ao conectar na instancia. Verifique os logs." };
        }
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
