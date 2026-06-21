import axios from 'axios';
import { GlobalSettingsRepository } from '../repositories/GlobalSettingsRepository';

export class EvolutionService {
    private static async getCredentials() {
        const settings = await GlobalSettingsRepository.get().catch(() => null);
        return {
            url: settings?.evolution_api_url || process.env.EVOLUTION_API_URL || 'http://116.203.152.114:8080',
            key: settings?.evolution_api_key || process.env.EVOLUTION_API_KEY || 'X8G9W2M4V5N7B3L1K6J0H9P2Y3T5C8F1'
        };
    }

    public static async logoutInstance(instancia: string): Promise<void> {
        const { url, key } = await this.getCredentials();
        try {
            await axios.delete(`${url}/instance/logout/${instancia}`, {
                headers: { 'apikey': key }
            });
        } catch (e: any) {
            console.error("Evolution Logout Error:", e.response?.data || e.message);
        }
    }

    public static async createInstance(instancia: string): Promise<void> {
        const { url, key } = await this.getCredentials();
        try {
            await axios.post(`${url}/instance/create`, {
                instanceName: instancia,
                name: instancia,
                integration: "WHATSAPP-BAILEYS",
                token: instancia,
                qrcode: true
            }, {
                headers: { 'apikey': key, 'Content-Type': 'application/json' }
            });
        } catch (e: any) {
            console.error("Evolution Create Error:", e.response?.data || e.message);
        }
    }

    public static async updateAdvancedSettings(instancia: string, settings: any): Promise<void> {
        const { url } = await this.getCredentials();
        try {
            await axios.put(`${url}/instance/${instancia}/advanced-settings`, settings, {
                headers: { 'apikey': instancia, 'Content-Type': 'application/json' }
            });
        } catch (e: any) {
            console.error(`Evolution Update Settings Error for ${instancia}:`, e.response?.data || e.message);
        }
    }

    public static async getQrCodeOrStatus(instancia: string, phone?: string): Promise<any> {
        const { url, key } = await this.getCredentials();
        let defaultWebhook = 'https://n8n1.vysortech.app.br/webhook/9b37f408-861d-4cb8-beb3-1f66ef0233d7/:instancia';
        let webhookTemplate = process.env.WEBHOOK_URL || defaultWebhook;
        const WEBHOOK_URL = webhookTemplate.replace(':instancia', instancia);

        let isEvoGo = false;
        let evoGoState = '';

        // 1. Check Evo Go status directly using instance token
        try {
            const statusRes = await axios.get(`${url}/instance/status`, {
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
                const statusRes = await axios.get(`${url}/instance/status`, {
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
                    await axios.post(`${url}/webhook/set/${instancia}`, {
                        webhook: {
                            enabled: true,
                            url: WEBHOOK_URL,
                            webhookByEvents: false,
                            webhookBase64: false,
                            events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "MESSAGES_DELETE", "SEND_MESSAGE", "CONNECTION_UPDATE", "CALL"]
                        }
                    }, { headers: { 'apikey': key } }).catch(() => {});

                    await axios.post(`${url}/instance/connect`, {
                        webhookUrl: WEBHOOK_URL
                    }, { headers: { 'apikey': instancia } });
                    
                    // Wait a bit for the Bailey's socket to generate the QR Code
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch(e: any) {
                    console.error("Evolution Go Connect Error:", e.response?.data || e.message);
                }
            }

            let result: any = { base64: null, pairingCode: null, status: evoGoState.toUpperCase() };
            
            // Try fetching the QR Code
            try {
                const qrRes = await axios.get(`${url}/instance/qr`, { 
                    headers: { 'apikey': instancia } 
                });
                result.base64 = qrRes.data?.data?.Qrcode || qrRes.data?.Qrcode || qrRes.data?.base64 || null;
            } catch(e) {}

            // Try fetching the Pairing Code if phone is provided
            if (phone) {
                try {
                    const pairRes = await axios.post(`${url}/instance/pair`, { phone }, { 
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
                await axios.post(`${url}/webhook/set/${instancia}`, {
                    webhook: {
                        enabled: true,
                        url: WEBHOOK_URL,
                        byEvents: false,
                        base64: false,
                        events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "MESSAGES_DELETE", "SEND_MESSAGE", "CONNECTION_UPDATE", "CALL"]
                    }
                }, { headers: { 'apikey': key } });
            } catch(e) {}

            let urlStr = `${url}/instance/connect/${instancia}`;
            if (phone) urlStr += `?phone=${phone}`;
            
            const connectResponse = await axios.get(urlStr, {
                headers: { 'apikey': key }
            });

            let finalData = connectResponse.data || {};
            if (!finalData.base64) {
                const qr = finalData.qrcode || finalData.Qrcode || finalData.data?.qrcode || finalData.data?.Qrcode || finalData.data?.base64;
                if (qr) finalData.base64 = qr;
            }
            return finalData;

        } catch (finalErr: any) {
            console.error("Evolution API Classic Error:", finalErr.response?.data || finalErr.message);
            return { base64: null, error: "Falha ao conectar na instancia. Verifique os logs." };
        }
    }
}
