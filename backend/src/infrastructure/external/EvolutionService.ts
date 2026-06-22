import axios from 'axios';
import axiosRetry from 'axios-retry';
import { GlobalSettingsRepository } from '../database/repositories/GlobalSettingsRepository';
import { logger } from '../../shared/logger';

const evolutionApi = axios.create({
    timeout: 15000, 
});

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

    private static headers(key: string, instance?: string) {
        const h: any = { 'apikey': key, 'Content-Type': 'application/json' };
        if (instance) {
            h['instance'] = instance; // Golang API usa header 'instance' em vez de query param na maioria das rotas
        }
        return h;
    }

    // ─── 1. Criar Instância (Golang API: POST /instance/create) ─────────
    public static async createInstance(instancia: string): Promise<void> {
        const { url, key } = await this.getCredentials();
        try {
            // Em Evolution-Go (Golang), o payload de criação é muito mais limpo
            // e os Webhooks são configurados na hora do /connect.
            await evolutionApi.post(`${url}/instance/create`, {
                name: instancia,
                instanceId: instancia,
                token: instancia,
            }, {
                headers: this.headers(key)
            });
        } catch (e: any) {
            const errData = e.response?.data;
            logger.error({ err: errData || e.message, instancia }, "Evolution-Go Create Error");
            if (errData && errData.message && !errData.message.includes('already exists')) {
                throw new Error(`Falha ao criar instância: ${JSON.stringify(errData)}`);
            }
        }
    }

    // ─── 2. Configurações da Instância (POST /instance/{id}/advanced-settings) ─
    public static async updateAdvancedSettings(instancia: string, settings: any): Promise<void> {
        const { url, key } = await this.getCredentials();
        try {
            const payload = {
                rejectCall: settings.rejectCall ?? true,
                msgRejectCall: settings.msgCall ?? "Neste canal não aceitamos ligações. Por favor, envie uma mensagem de texto.",
                ignoreGroups: settings.ignoreGroups ?? false,
                alwaysOnline: settings.alwaysOnline ?? false,
                readMessages: settings.readMessages ?? false,
                ignoreStatus: settings.readStatus ?? settings.ignoreStatus ?? false,
            };

            await evolutionApi.post(`${url}/instance/${instancia}/advanced-settings`, payload, {
                headers: this.headers(key)
            });
        } catch (e: any) {
            logger.error({ err: e.response?.data || e.message, instancia }, "Evolution-Go Update Settings Error");
        }
    }

    // ─── 3. Conectar / Gerar QR Code (Golang API: POST /instance/connect) ──
    public static async connectInstance(instancia: string, phone?: string): Promise<any> {
        const { url, key } = await this.getCredentials();
        const baseUrl = process.env.BACKEND_URL || process.env.FRONTEND_URL || 'https://food.vysortech.app.br';
        const WEBHOOK_URL = `${baseUrl}/api/whatsapp/webhooks`;
        
        try {
            // No Evolution-Go, é no POST /connect que enviamos o Webhook!
            const connectResponse = await evolutionApi.post(`${url}/instance/connect`, {
                webhookUrl: WEBHOOK_URL,
                phone: phone || undefined,
                subscribe: [
                    "MESSAGE",
                    "CONNECTION_UPDATE",
                    "MESSAGES_UPDATE"
                ] // Tenta passar eventos compatíveis com a v2/Go. Se falhar, passaremos vazio.
            }, {
                headers: this.headers(key, instancia)
            });

            const data = connectResponse?.data || {};
            
            // Em Go, o QR code geralmente vem na mesma resposta ou precisa buscar em /instance/qr
            let base64 = data.base64 || data.qrcode || null;
            const code = data.pairingCode || data.code || null;

            // Se não veio base64 no connect, e também não veio pairingCode, tenta buscar o QR em /instance/qr
            if (!base64 && !code) {
                try {
                    const qrRes = await evolutionApi.get(`${url}/instance/qr`, { headers: this.headers(key, instancia) });
                    base64 = qrRes.data?.base64 || qrRes.data?.qrcode || null;
                } catch(e) {
                    logger.warn({ instancia }, "Falha ao buscar QR em /instance/qr");
                }
            }

            return {
                instance: instancia,
                base64,
                code,
                pairingCode: code,
            };
        } catch(err: any) {
            const status = err.response?.status;
            const detail = err.response?.data || err.message;

            if (status === 403) {
                logger.warn({ instancia }, "Instância já está conectada (403)");
                return { instance: instancia, base64: null, code: null, alreadyConnected: true };
            }
            logger.error({ status, detail, instancia }, "ERRO na conexão Evolution-Go");
            return { base64: null, code: null, error: `Falha ao conectar: ${JSON.stringify(detail)}` };
        }
    }

    // ─── 4. Consulta do Estado da Conexão (GET /instance/status) ───────
    public static async getConnectionState(instancia: string): Promise<string> {
        const { url, key } = await this.getCredentials();
        try {
            const res = await evolutionApi.get(`${url}/instance/status`, {
                headers: this.headers(key, instancia)
            });
            // Evolution-Go status pode retornar state: "open", "close", "connecting"
            return res.data?.state || 'close';
        } catch (e: any) {
            return 'close';
        }
    }

    // ─── 6.1 Logout (DELETE /instance/logout) ──────────
    public static async logoutInstance(instancia: string): Promise<void> {
        const { url, key } = await this.getCredentials();
        try {
            await evolutionApi.delete(`${url}/instance/logout`, {
                headers: this.headers(key, instancia)
            });
        } catch (e: any) {
            logger.error({ err: e.response?.data || e.message, instancia }, "Evolution-Go Logout Error");
        }
    }

    // ─── 6.2 Deletar Instância (DELETE /instance/delete/{instanceId}) ─
    public static async deleteInstance(instancia: string): Promise<void> {
        const { url, key } = await this.getCredentials();
        try {
            await evolutionApi.delete(`${url}/instance/delete/${instancia}`, {
                headers: this.headers(key)
            });
        } catch (e: any) {
            logger.error({ err: e.response?.data || e.message, instancia }, "Evolution-Go Delete Error");
        }
    }

    // ─── 6.3 Restart Instância (PUT /instance/forcereconnect/{instanceId}) ─
    public static async restartInstance(instancia: string): Promise<void> {
        const { url, key } = await this.getCredentials();
        try {
            await evolutionApi.put(`${url}/instance/forcereconnect/${instancia}`, {}, {
                headers: this.headers(key)
            });
        } catch (e: any) {
            logger.error({ err: e.response?.data || e.message, instancia }, "Evolution-Go Restart Error");
        }
    }
}
