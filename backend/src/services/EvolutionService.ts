import axios from 'axios';

const EVO_URL = process.env.EVOLUTION_API_URL || 'http://116.203.152.114:8080';
const EVO_KEY = process.env.EVOLUTION_API_KEY || 'X8G9W2M4V5N7B3L1K6J0H9P2Y3T5C8F1';

export class EvolutionService {
    public static async createInstance(instancia: string): Promise<void> {
        try {
            await axios.post(`${EVO_URL}/instance/create`, {
                instanceName: instancia,
                name: instancia,
                integration: "WHATSAPP-BAILEYS",
                token: instancia,
                qrcode: true
            }, {
                headers: { 'apikey': EVO_KEY, 'Content-Type': 'application/json' }
            });
        } catch (e: any) {
            console.error("Evolution Create Error:", e.response?.data || e.message);
        }
    }

    public static async getQrCodeOrStatus(instancia: string, phone?: string): Promise<any> {
        let defaultWebhook = 'https://n8n1.vysortech.app.br/webhook/9b37f408-861d-4cb8-beb3-1f66ef0233d7/:instancia';
        let webhookTemplate = process.env.WEBHOOK_URL || defaultWebhook;
        const WEBHOOK_URL = webhookTemplate.replace(':instancia', instancia);

        let connectResponse;
        
        try {
            try {
                await axios.post(`${EVO_URL}/webhook/set/${instancia}`, {
                    webhook: {
                        enabled: true,
                        url: WEBHOOK_URL,
                        byEvents: false,
                        base64: false,
                        events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "MESSAGES_DELETE", "SEND_MESSAGE", "CONNECTION_UPDATE", "CALL"]
                    }
                }, { headers: { 'apikey': EVO_KEY } });
            } catch(e) { 
                console.log('Aviso: Falha ao setar webhook na rota antiga'); 
            }

            let urlStr = `${EVO_URL}/instance/connect/${instancia}`;
            if (phone) urlStr += `?phone=${phone}`;
            
            connectResponse = await axios.get(urlStr, {
                headers: { 'apikey': EVO_KEY }
            });
        } catch (err: any) {
            if (err.response?.status === 404 || err.response?.status === 401 || err.response?.status === 403) {
                console.log("Detectado Evolution Go, conectando por rota alternativa...");
                
                try {
                    // Tentar setar o webhook padrão do Evolution Go
                    await axios.post(`${EVO_URL}/webhook/set/${instancia}`, {
                        webhook: {
                            enabled: true,
                            url: WEBHOOK_URL,
                            webhookByEvents: false,
                            webhookBase64: false,
                            events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "MESSAGES_DELETE", "SEND_MESSAGE", "CONNECTION_UPDATE", "CALL"]
                        }
                    }, { headers: { 'apikey': EVO_KEY } }).catch(() => {});

                    let connectUrl = `${EVO_URL}/instance/connect/${instancia}`;
                    if (phone) connectUrl += `?number=${phone}`;
                    
                    connectResponse = await axios.get(connectUrl, { 
                        headers: { 'apikey': EVO_KEY } 
                    });
                } catch(e: any) { 
                    console.log('Aviso: Falha ao conectar no Evolution Go', e.response?.data || e.message); 
                    throw e;
                }
            } else {
                throw err;
            }
        }

        let finalData = connectResponse.data;
        if (!finalData.base64) {
            const qr = finalData.qrcode || finalData.Qrcode || finalData.data?.qrcode || finalData.data?.Qrcode || finalData.data?.base64;
            if (qr) finalData.base64 = qr;
        }

        return finalData;
    }
}
