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
            // Do NOT throw e here, because if the instance already exists we still want to save it in DB
        }
    }

    public static async connectInstance(instancia: string, phone?: string): Promise<any> {
        const { url, key } = await this.getCredentials();
        
        let defaultWebhook = 'https://n8n1.vysortech.app.br/webhook/9b37f408-861d-4cb8-beb3-1f66ef0233d7/:instancia';
        let webhookTemplate = process.env.WEBHOOK_URL || defaultWebhook;
        const WEBHOOK_URL = webhookTemplate.replace(':instancia', instancia);
        
        let connectResponse;

        try {
            // Setup Webhook initially for classic
            try {
                await evolutionApi.post(`${url}/webhook/set/${instancia}`, {
                    webhook: {
                        enabled: true,
                        url: WEBHOOK_URL,
                        webhookByEvents: false,
                        webhookBase64: false,
                        events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "MESSAGES_DELETE", "SEND_MESSAGE", "CONNECTION_UPDATE", "CALL"]
                    }
                }, { headers: { 'apikey': key } });
            } catch(e) { 
                logger.warn('Aviso: Falha ao setar webhook na rota antiga'); 
            }

            let urlStr = `${url}/instance/connect/${instancia}`;
            if (phone) urlStr += `?phone=${phone}`;
            
            connectResponse = await evolutionApi.get(urlStr, {
                headers: { 'apikey': key }
            });
        } catch (err: any) {
            logger.info(`Fallback ativado para instância ${instancia}. Motivo: ${err.response?.status || err.message}`);
            
            // 1. Tentar criar a instância (seja Evo API ou Evo Go, isso é seguro e pode falhar se já existir)
            await this.createInstance(instancia).catch(() => {});

            // 2. Tentar setar o webhook padrão do Evolution Go
            await evolutionApi.post(`${url}/webhook/set/${instancia}`, {
                webhook: {
                    enabled: true,
                    url: WEBHOOK_URL,
                    webhookByEvents: false,
                    webhookBase64: false,
                    events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "MESSAGES_DELETE", "SEND_MESSAGE", "CONNECTION_UPDATE", "CALL"]
                }
            }, { headers: { 'apikey': key } }).catch(() => {});

            // 3. Tentar conectar (Evo Go)
            let isEvoGo = false;
            try {
                await evolutionApi.post(`${url}/instance/connect`, {
                    webhookUrl: WEBHOOK_URL
                }, { headers: { 'apikey': instancia } });
                isEvoGo = true;
                // Aguarda 2 segundos para o Evo Go gerar o QR Code
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch(e) {}

            if (isEvoGo) {
                let result: any = { base64: null, pairingCode: null };
                
                // 4. Pegar QR Code (Evo Go)
                try {
                    const qrRes = await evolutionApi.get(`${url}/instance/qr`, { 
                        headers: { 'apikey': instancia } 
                    });
                    result.base64 = qrRes.data?.data?.Qrcode || qrRes.data?.Qrcode || qrRes.data?.base64 || null;
                } catch(e) {}

                // 5. Pedir Pairing Code (Evo Go)
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

            // 6. Se nada deu certo (ex: era Evo API normal que só não existia), tenta conectar na rota padrao denovo
            let urlStr = `${url}/instance/connect/${instancia}`;
            if (phone) urlStr += `?phone=${phone}`;
            
            try {
                connectResponse = await evolutionApi.get(urlStr, {
                    headers: { 'apikey': key }
                });
            } catch(finalErr: any) {
                logger.error("ERRO FINAL na conexao. Provavelmente a instancia nao foi criada ou rota invalida:", finalErr.response?.data || finalErr.message);
                // Return empty object to let frontend show generic QR code loading or waiting
                return { base64: null, error: "Falha ao conectar na instancia. Verifique os logs." };
            }
        }

        let finalData = connectResponse?.data || {};
        if (!finalData.base64) {
            const qr = finalData.qrcode || finalData.Qrcode || finalData.data?.qrcode || finalData.data?.Qrcode || finalData.data?.base64;
            if (qr) finalData.base64 = qr;
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
