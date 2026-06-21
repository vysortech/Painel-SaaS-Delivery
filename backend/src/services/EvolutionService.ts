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

        let connectResponse;
        
        try {
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
            } catch(e) { 
                console.log('Aviso: Falha ao setar webhook na rota antiga'); 
            }

            let urlStr = `${url}/instance/connect/${instancia}`;
            if (phone) urlStr += `?phone=${phone}`;
            
            connectResponse = await axios.get(urlStr, {
                headers: { 'apikey': key }
            });
        } catch (err: any) {
            console.log(`Fallback ativado para instância ${instancia}. Motivo:`, err.response?.status || err.message);
            
            // 1. Tentar criar a instância (seja Evo API ou Evo Go, isso é seguro e pode falhar se já existir)
            await this.createInstance(instancia).catch(() => {});

            // 2. Tentar setar o webhook padrão do Evolution Go
            await axios.post(`${url}/webhook/set/${instancia}`, {
                webhook: {
                    enabled: true,
                    url: WEBHOOK_URL,
                    webhookByEvents: false,
                    webhookBase64: false,
                    events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "MESSAGES_DELETE", "SEND_MESSAGE", "CONNECTION_UPDATE", "CALL"]
                }
            }, { headers: { 'apikey': key } }).catch(() => {});

            // 3. Tentar conectar (Evo Go)
            await axios.post(`${url}/instance/connect`, {}, { 
                headers: { 'apikey': instancia } 
            }).catch(() => {}); // ignore se já estiver conectando
            
            if (phone) {
                // 4. Pedir Pairing Code (Evo Go)
                try {
                    const pairRes = await axios.post(`${url}/instance/pair`, { phone }, { 
                        headers: { 'apikey': instancia } 
                    });
                    if (pairRes.data?.data?.PairingCode || pairRes.data?.PairingCode) {
                        return { pairingCode: pairRes.data?.data?.PairingCode || pairRes.data?.PairingCode };
                    }
                } catch(e) {}
            } else {
                // 5. Pegar QR Code (Evo Go)
                try {
                    const qrRes = await axios.get(`${url}/instance/qr`, { 
                        headers: { 'apikey': instancia } 
                    });
                    if (qrRes.data?.data?.Qrcode || qrRes.data?.Qrcode) {
                        return { base64: qrRes.data?.data?.Qrcode || qrRes.data?.Qrcode };
                    }
                } catch(e) {}
            }

            // 6. Se nada deu certo (ex: era Evo API normal que só não existia), tenta conectar na rota padrao denovo
            let urlStr = `${url}/instance/connect/${instancia}`;
            if (phone) urlStr += `?phone=${phone}`;
            
            connectResponse = await axios.get(urlStr, {
                headers: { 'apikey': key }
            });
        }

        let finalData = connectResponse.data;
        if (!finalData.base64) {
            const qr = finalData.qrcode || finalData.Qrcode || finalData.data?.qrcode || finalData.data?.Qrcode || finalData.data?.base64;
            if (qr) finalData.base64 = qr;
        }

        return finalData;
    }
}
