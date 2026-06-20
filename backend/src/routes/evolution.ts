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
        const connectResponse = await axios.get(`${EVO_URL}/instance/connect/${instancia}`, {
            headers: { 'apikey': EVO_KEY }
        });

        res.json(connectResponse.data);

    } catch (err: any) {
        console.error("Evolution API Error:", err.response?.data || err.message);
        res.status(500).json({ error: 'Erro ao comunicar com Evolution API' });
    }
});

export default router;
