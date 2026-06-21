import { Router, Request, Response } from 'express';
import { EvolutionService } from '../services/EvolutionService';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/connect/:instancia', async (req: Request, res: Response) => {
    const { instancia } = req.params;
    const phone = req.query.phone as string | undefined;
    
    try {
        await EvolutionService.createInstance(instancia);
        const data = await EvolutionService.getQrCodeOrStatus(instancia, phone);
        res.json(data);
    } catch (err: any) {
        const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
        console.error("Evolution API Error:", errorMsg);
        res.status(500).json({ error: 'Erro Evolution API', details: errorMsg });
    }
});

export default router;
