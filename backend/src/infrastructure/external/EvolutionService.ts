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
        
        let isEvoGo = false;
        let evoGoState = '';

        // 1. Check Evo Go status directly using instance token
        try {
            const statusRes = await evolutionApi.get(`${url}/instance/status`, {
                headers: { 'apikey': instancia }
            });
            isEvoGo = true;
            evoGoState = statusRes.data?.instance?.state || statusRes.data?.state || '';
        } catch (e) {
            // It might fail if the instance is not created yet, or if it's the old Evolution API
        }

        // If it failed, let's try creating it just in case it's a new Evo Go instance that doesn't exist yet
        if (!isEvoGo) {
            await this.createInstance(instancia).catch(() => {});
            
            // Try checking status again
            try {
                const statusRes = await evolutionApi.get(`${url}/instance/status`, {
                    headers: { 'apikey': instancia }
                });
                isEvoGo = true;
                evoGoState = statusRes.data?.instance?.state || statusRes.data?.state || '';
            } catch (e) {}
        }

        // --- EVOLUTION GO LOGIC ---
        if (isEvoGo) {
            if (evoGoState === 'open') {
                return { connected: true, status: 'CONNECTED' };
            }

            // Only request a new connection if it's not already connecting
            if (evoGoState !== 'connecting') {
                try {
                    await evolutionApi.post(`${url}/webhook/set/${instancia}`, {
                        webhook: {
                            enabled: true,
                            url: WEBHOOK_URL,
                            webhookByEvents: false,
                            webhookBase64: true,
                            events: ["QRCODE_UPDATED", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE", "CONNECTION_UPDATE", "CALL"]
                        }
                    }, { headers: { 'apikey': key } }).catch(() => {});

                    await evolutionApi.post(`${url}/instance/connect`, {
                        webhookUrl: WEBHOOK_URL
                    }, { headers: { 'apikey': instancia } });
                    
                    // Wait a bit for the Bailey's socket to generate the QR Code
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch(e: any) {
                    logger.error({ err: e.response?.data || e.message }, "Evolution Go Connect Error");
                }
            }

            let result: any = { base64: null, pairingCode: null };
            
            // Try fetching the QR Code
            try {
                const qrRes = await evolutionApi.get(`${url}/instance/qr`, { 
                    headers: { 'apikey': instancia } 
                });
                result.base64 = qrRes.data?.data?.Qrcode || qrRes.data?.Qrcode || qrRes.data?.base64 || null;
            } catch(e) {}

            // Try fetching the Pairing Code if phone is provided
            if (phone) {
                try {
                    const pairRes = await evolutionApi.post(`${url}/instance/pair`, { phone }, { 
                        headers: { 'apikey': instancia } 
                    });
                    result.pairingCode = pairRes.data?.data?.PairingCode || pairRes.data?.PairingCode || pairRes.data?.code || null;
                } catch(e) {}
            }

            return result;
        }

        // --- EVOLUTION API (CLASSIC) FALLBACK LOGIC ---
        try {
            // Setup Webhook
            try {
                await evolutionApi.post(`${url}/webhook/set/${instancia}`, {
                    webhook: {
                        enabled: true,
                        url: WEBHOOK_URL,
                        byEvents: false,
                        base64: true,
                        events: ["QRCODE_UPDATED", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE", "CONNECTION_UPDATE", "CALL"]
                    }
                }, { headers: { 'apikey': key } });
            } catch(e) {}

            let urlStr = `${url}/instance/connect/${instancia}`;
            if (phone) urlStr += `?phone=${phone}`;
            
            const connectResponse = await evolutionApi.get(urlStr, {
                headers: { 'apikey': key }
            });

            let finalData = connectResponse.data || {};
            if (!finalData.base64) {
                const qr = finalData.qrcode || finalData.Qrcode || finalData.data?.qrcode || finalData.data?.Qrcode || finalData.data?.base64;
                if (qr) finalData.base64 = qr;
            }
            return finalData;

        } catch (finalErr: any) {
            logger.error({ err: finalErr.response?.data || finalErr.message }, "Evolution API Classic Error");
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
