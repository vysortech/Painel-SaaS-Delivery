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
            let defaultWebhook = 'https://n8n1.vysortech.app.br/webhook/9b37f408-861d-4cb8-beb3-1f66ef0233d7/:instancia';
            let webhookTemplate = process.env.WEBHOOK_URL || defaultWebhook;
            const WEBHOOK_URL = webhookTemplate.replace(':instancia', instancia);

            await evolutionApi.post(`${url}/instance/create`, {
                instanceName: instancia,
                token: instancia,
                b64: true,
                webhook: WEBHOOK_URL,
                webhook_by_events: false,
                events: [
                    "MESSAGES_UPSERT",
                    "CONNECTION_UPDATE",
                    "SEND_MESSAGE"
                ]
            }, {
                headers: { 'apikey': key, 'Content-Type': 'application/json' }
            });
        } catch (e: any) {
            logger.error({ err: e.response?.data || e.message, instancia }, "Evolution Create Error");
            // Do NOT throw e here, because if the instance already exists we still want to save it in DB
        }
    }

    public static async connectInstance(instancia: string, phone?: string): Promise<any> {
        const { url, key } = await this.getCredentials();
        
        let urlStr = `${url}/instance/connect/${instancia}`;
        if (phone) urlStr += `?number=${phone}`; // Evolution Go uses 'number' parameter
        
        try {
            const connectResponse = await evolutionApi.get(urlStr, {
                headers: { 'apikey': key }
            });

            let finalData = connectResponse?.data || {};
            
            return {
                instance: finalData.instance || instancia,
                base64: finalData.base64 || finalData.qrcode || finalData.Qrcode || null,
                pairingCode: finalData.pairingCode || finalData.code || null,
                code: finalData.code || null
            };
        } catch(err: any) {
            logger.error("ERRO na conexao Evolution Go:", err.response?.data || err.message);
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
            // Mapping UI properties to Evolution Go properties
            const payload = {
                rejectCall: settings.rejectCall ?? true,
                ignoreGroups: settings.ignoreGroups ?? false,
                alwaysOnline: settings.alwaysOnline ?? false,
                readMessages: settings.readMessages ?? false,
                readStatus: settings.ignoreStatus ?? false,
                syncFullHistory: settings.syncFullHistory ?? false
            };

            await evolutionApi.post(`${url}/settings/set/${instancia}`, payload, {
                headers: { 'apikey': key, 'Content-Type': 'application/json' }
            });
        } catch (e: any) {
            logger.error({ err: e.response?.data || e.message, instancia }, "Evolution Update Settings Error");
        }
    }
}
