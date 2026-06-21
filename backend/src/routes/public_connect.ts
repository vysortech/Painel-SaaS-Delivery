import { Router, Request, Response } from 'express';
import axios from 'axios';
import { ConfigRepository } from '../repositories/ConfigRepository';
import { EvolutionService } from '../services/EvolutionService';

const router = Router();

const EVO_URL = process.env.EVOLUTION_API_URL || 'http://116.203.152.114:8080';

router.get('/qrcode/:token', async (req: Request, res: Response) => {
    const { token } = req.params;
    try {
        const tenant = await ConfigRepository.getByToken(token);
        
        if (!tenant) {
            return res.status(404).json({ error: 'Link inválido ou expirado' });
        }

        const instancia = tenant.instancia;
        
        // Check Evolution Go status
        try {
            const stateRes = await axios.get(`${EVO_URL}/instance/connectionState/${instancia}`, {
                headers: { 'apikey': instancia }
            });
            const state = stateRes.data?.instance?.state || stateRes.data?.state;
            
            if (state === 'open') {
                await ConfigRepository.updateConnectionStatusByToken(token, 'CONNECTED');
                return res.json({ connected: true, status: 'CONNECTED' });
            }
        } catch(e) {
            // Ignore if not connected yet
        }

        const phone = req.query.phone as string | undefined;
        const finalData = await EvolutionService.getQrCodeOrStatus(instancia, phone);

        res.json({ 
            connected: false, 
            ...finalData, 
            instanceName: instancia,
            nome_empresa: tenant.nome_empresa,
            telefone_admin: tenant.telefone_admin
        });
    } catch (err: any) {
        console.error("Public Connect Error:", err.message);
        res.status(500).json({ error: 'Erro ao buscar QR Code' });
    }
});

export default router;
