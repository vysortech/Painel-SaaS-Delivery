import { Router } from 'express';
import axios from 'axios';

const router = Router();

const EVO_URL = process.env.EVOLUTION_API_URL || 'http://116.203.152.114:8080';
const EVO_KEY = process.env.EVOLUTION_API_KEY || 'X8G9W2M4V5N7B3L1K6J0H9P2Y3T5C8F1';

// Busca o QR Code ou Status de uma instância, criando-a se não existir.
router.get('/connect/:instancia', async (req, res) => {
    const { instancia } = req.params;
    
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

        // 2. Buscar o QR Code da instância para conectar
        let connectResponse;
        try {
            // Padrão: Evolution API v1 / v2 (NodeJS)
            connectResponse = await axios.get(`${EVO_URL}/instance/connect/${instancia}`, {
                headers: { 'apikey': EVO_KEY }
            });
        } catch (err: any) {
            // Se retornar 404, significa que é a Evolution Go! (que usa outra rota)
            if (err.response?.status === 404) {
                console.log("Detectado Evolution Go, buscando QR Code por rota alternativa...");
                connectResponse = await axios.get(`${EVO_URL}/instance/qr?instance=${instancia}`, {
                    headers: { 'apikey': EVO_KEY }
                });
            } else {
                throw err;
            }
        }

        // Evolution NodeJS retorna { base64: "..." }
        // Evolution Go pode retornar { qrcode: "..." } ou { data: { qrcode: "..." } }
        let finalData = connectResponse.data;
        if (!finalData.base64) {
            if (finalData.qrcode) finalData.base64 = finalData.qrcode;
            else if (finalData.data?.qrcode) finalData.base64 = finalData.data.qrcode;
            else if (finalData.data?.base64) finalData.base64 = finalData.data.base64;
        }

        res.json(finalData);

    } catch (err: any) {
        const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
        console.error("Evolution API Error:", errorMsg);
        res.status(500).json({ error: 'Erro Evolution API', details: errorMsg });
    }
});

export default router;
