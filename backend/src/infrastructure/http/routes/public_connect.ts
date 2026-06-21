import { Router, Request, Response } from 'express';
import axios from 'axios';
import { ConfigRepository } from '../../database/repositories/ConfigRepository';
import { GlobalSettingsRepository } from '../../database/repositories/GlobalSettingsRepository';
import { EvolutionService } from '../../external/EvolutionService';

const router = Router();

router.get('/qrcode/:token', async (req: Request, res: Response) => {
    const { token } = req.params;
    try {
        const tenant = await ConfigRepository.getByToken(token);
        
        if (!tenant) {
            return res.status(404).json({ error: 'Link inválido ou expirado' });
        }

        const settings = await GlobalSettingsRepository.get().catch(() => null);
        const EVO_URL = settings?.evolution_api_url || process.env.EVOLUTION_API_URL;
        
        if (!EVO_URL) {
            return res.status(500).json({ error: 'Evolution API não configurada.' });
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

        let phone = req.query.phone as string | undefined;
        if (!phone) {
            if (tenant.telefone_whatsapp) {
                phone = tenant.telefone_whatsapp.replace(/\D/g, '');
            } else if (tenant.telefone_admin) {
                phone = tenant.telefone_admin.split(',')[0].replace(/\D/g, '');
            }
        }
        
        const finalData = await EvolutionService.getQrCodeOrStatus(instancia, phone);

        if (finalData.connected || finalData.status === 'CONNECTED' || finalData.status === 'OPEN') {
            await ConfigRepository.updateConnectionStatusByToken(token, 'CONNECTED');
        }

        res.json({ 
            connected: false, 
            ...finalData, 
            instanceName: instancia,
            nome_empresa: tenant.nome_empresa,
            telefone_admin: tenant.telefone_admin,
            telefone_whatsapp: tenant.telefone_whatsapp
        });
    } catch (err: any) {
        console.error("Public Connect Error:", err.message);
        res.status(500).json({ error: 'Erro ao buscar QR Code' });
    }
});

export default router;
