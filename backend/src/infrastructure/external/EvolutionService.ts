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
    // ─── Autenticação (Seção 0) ───────────────────────────────────────
    private static async getCredentials() {
        const settings = await GlobalSettingsRepository.get().catch(() => null);
        const url = settings?.evolution_api_url || process.env.EVOLUTION_API_URL;
        const key = settings?.evolution_api_key || process.env.EVOLUTION_API_KEY;
        if (!url || !key) {
            throw new Error('Evolution API URL ou API Key não configurados.');
        }
        return { url, key };
    }

    private static headers(key: string) {
        return { 'apikey': key, 'Content-Type': 'application/json' };
    }

    // ─── 1. Criar Instância (POST /instance/create) ──────────────────
    public static async createInstance(instancia: string): Promise<void> {
        const { url, key } = await this.getCredentials();
        try {
            // O webhook DEVE apontar para o nosso próprio backend que irá processar os eventos
            // via webhook.ts e EvolutionWorker.ts, onde está a lógica do socket.io e filas.
            const baseUrl = process.env.BACKEND_URL || process.env.FRONTEND_URL || 'http://localhost:4000';
            const WEBHOOK_URL = `${baseUrl}/api/whatsapp/webhooks`;

            await evolutionApi.post(`${url}/instance/create`, {
                instanceName: instancia,
                token: instancia,
                qrcode: true,
                b64: true,
                integration: "WHATSAPP-BAILEYS",
                webhook: WEBHOOK_URL,
                webhook_by_events: false,
                webhook_base64: false,
                events: [
                    "MESSAGES_UPSERT",
                    "CONNECTION_UPDATE",
                    "SEND_MESSAGE",
                    "MESSAGES_UPDATE",
                    "QRCODE_UPDATED"
                ]
            }, {
                headers: this.headers(key)
            });
        } catch (e: any) {
            logger.error({ err: e.response?.data || e.message, instancia }, "Evolution Create Error");
            // Não faz throw — se a instância já existe, continuamos normalmente
        }
    }

    // ─── 2. Configurações da Instância (POST /settings/set/:instanceName) ─
    public static async updateAdvancedSettings(instancia: string, settings: any): Promise<void> {
        const { url, key } = await this.getCredentials();
        try {
            const payload = {
                rejectCall: settings.rejectCall ?? true,
                msgCall: settings.msgCall ?? "Neste canal não aceitamos ligações. Por favor, envie uma mensagem de texto.",
                ignoreGroups: settings.ignoreGroups ?? false,
                alwaysOnline: settings.alwaysOnline ?? false,
                readMessages: settings.readMessages ?? false,
                readStatus: settings.readStatus ?? settings.ignoreStatus ?? false,
                syncFullHistory: settings.syncFullHistory ?? false
            };

            await evolutionApi.post(`${url}/settings/set/${instancia}`, payload, {
                headers: this.headers(key)
            });
        } catch (e: any) {
            logger.error({ err: e.response?.data || e.message, instancia }, "Evolution Update Settings Error");
        }
    }

    // ─── 3. Conectar / Gerar QR Code ou Pairing Code ─────────────────
    // GET /instance/connect/:instanceName
    // Com número: GET /instance/connect/:instanceName?number=5511999999999
    public static async connectInstance(instancia: string, phone?: string): Promise<any> {
        const { url, key } = await this.getCredentials();
        
        let urlStr = `${url}/instance/connect/${instancia}`;
        if (phone) urlStr += `?number=${phone}`;
        
        try {
            const connectResponse = await evolutionApi.get(urlStr, {
                headers: { 'apikey': key }
            });

            const data = connectResponse?.data || {};
            
            return {
                instance: data.instance || instancia,
                base64: data.base64 || null,        // QR Code em base64 (Seção 3.2)
                code: data.code || null,             // Pairing Code de 8 chars (Seção 3.1)
                pairingCode: data.code || null,      // Alias para compatibilidade
                count: data.count || null             // Contador de tentativas de QR
            };
        } catch(err: any) {
            const status = err.response?.status;
            const detail = err.response?.data || err.message;

            // Seção 7 — Tratamento de erros
            if (status === 403) {
                logger.warn({ instancia }, "Instância já está conectada (403 Forbidden)");
                return { instance: instancia, base64: null, code: null, alreadyConnected: true };
            }
            if (status === 404) {
                logger.warn({ instancia }, "Instância não encontrada (404). Talvez tenha sido deletada.");
            }

            logger.error({ status, detail, instancia }, "ERRO na conexão Evolution Go");
            return { base64: null, code: null, error: "Falha ao conectar na instância. Verifique os logs." };
        }
    }

    // ─── 4. Consulta do Estado da Conexão (Polling) ──────────────────
    // GET /instance/connectionState/:instanceName
    public static async getConnectionState(instancia: string): Promise<string> {
        const { url, key } = await this.getCredentials();
        try {
            const res = await evolutionApi.get(`${url}/instance/connectionState/${instancia}`, {
                headers: { 'apikey': key }
            });
            // Retorna: "open", "connecting", "close"
            return res.data?.state || 'close';
        } catch (e: any) {
            logger.error({ err: e.response?.data || e.message, instancia }, "Evolution ConnectionState Error");
            return 'close';
        }
    }

    // ─── 6.1 Logout (DELETE /instance/logout/:instanceName) ──────────
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

    // ─── 6.2 Deletar Instância (DELETE /instance/delete/:instanceName) ─
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

    // ─── 6.3 Restart Instância (PUT /instance/restart/:instanceName) ─
    public static async restartInstance(instancia: string): Promise<void> {
        const { url, key } = await this.getCredentials();
        try {
            await evolutionApi.put(`${url}/instance/restart/${instancia}`, {}, {
                headers: { 'apikey': key }
            });
        } catch (e: any) {
            logger.error({ err: e.response?.data || e.message, instancia }, "Evolution Restart Error");
        }
    }
}
