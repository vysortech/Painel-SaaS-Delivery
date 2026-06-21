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

    public static async connectInstance(instancia: string): Promise<any> {
        const { url, key } = await this.getCredentials();
        try {
            const res = await evolutionApi.get(`${url}/instance/connect/${instancia}`, {
                headers: { 'apikey': key }
            });
            return res.data;
        } catch (e: any) {
            logger.error({ err: e.response?.data || e.message, instancia }, "Evolution Connect Error");
            throw e;
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
