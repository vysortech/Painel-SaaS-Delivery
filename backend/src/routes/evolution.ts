import { Router } from 'express';
import axios from 'axios';

const router = Router();

const EVO_URL = process.env.EVOLUTION_API_URL || 'http://116.203.152.114:8080';
const EVO_KEY = process.env.EVOLUTION_API_KEY || 'X8G9W2M4V5N7B3L1K6J0H9P2Y3T5C8F1';

// Busca o QR Code ou Status de uma instância, criando-a se não existir.
router.get('/connect/:instancia', async (req, res) => {
    const { instancia } = req.params;
    const { phone } = req.query; // Pega o telefone da query (opcional)
    
    try {
        // 1. Tentar criar a instância
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
            // Se já existe, o erro é contornado
        }

        // Webhook fixo com a URL solicitada (n8n1), substituindo a variável dinamicamente.
        let defaultWebhook = 'https://n8n1.vysortech.app.br/webhook/9b37f408-861d-4cb8-beb3-1f66ef0233d7/:instancia';
        let webhookTemplate = process.env.WEBHOOK_URL || defaultWebhook;
        const WEBHOOK_URL = webhookTemplate.replace(':instancia', instancia);

        // 2. Buscar o QR Code da instância para conectar E setar o Webhook
        let connectResponse;
        try {
            // Padrão: Evolution API v1 / v2 (NodeJS)
            // Na versão NodeJS, o webhook é setado via /webhook/set
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
            } catch(e) { console.log('Aviso: Falha ao setar webhook na rota antiga'); }

            let urlStr = `${EVO_URL}/instance/connect/${instancia}`;
            if (phone) urlStr += `?phone=${phone}`; // Suporte a Pairing Code na API NodeJS, se houver
            
            connectResponse = await axios.get(urlStr, {
                headers: { 'apikey': EVO_KEY }
            });
        } catch (err: any) {
            // Se retornar 404/401, significa que é a Evolution Go!
            if (err.response?.status === 404 || err.response?.status === 401) {
                console.log("Detectado Evolution Go, conectando e buscando QR Code por rota alternativa...");
                
                // Na Evolution Go, setamos o Webhook na rota /instance/connect e podemos enviar o phone
                try {
                    let connectPayload: any = {
                        instance: instancia,
                        webhookUrl: WEBHOOK_URL,
                        subscribe: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "MESSAGES_DELETE", "SEND_MESSAGE", "CONNECTION_UPDATE", "CALL"]
                    };
                    if (phone) connectPayload.phone = String(phone);

                    await axios.post(`${EVO_URL}/instance/connect`, connectPayload, { headers: { 'apikey': instancia, 'Content-Type': 'application/json' } });
                } catch(e: any) { console.log('Aviso: Falha ao setar webhook via Evolution Go /instance/connect', e.response?.data || e.message); }

                connectResponse = await axios.get(`${EVO_URL}/instance/qr?instance=${instancia}`, {
                    headers: { 'apikey': instancia }
                });
            } else {
                throw err;
            }
        }

        // Evolution NodeJS retorna { base64: "..." }
        // Evolution Go pode retornar { qrcode: "..." } ou { data: { Qrcode: "..." } }
        let finalData = connectResponse.data;
        if (!finalData.base64) {
            const qr = finalData.qrcode || finalData.Qrcode || finalData.data?.qrcode || finalData.data?.Qrcode || finalData.data?.base64;
            if (qr) finalData.base64 = qr;
        }

        res.json(finalData);

    } catch (err: any) {
        const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
        console.error("Evolution API Error:", errorMsg);
        res.status(500).json({ error: 'Erro Evolution API', details: errorMsg });
    }
});

export default router;
