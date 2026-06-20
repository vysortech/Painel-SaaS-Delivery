import { Router, Request, Response } from 'express';
import { AnalyticsRepository } from '../repositories/AnalyticsRepository';
import { authMiddleware, AuthRequest } from '../middlewares/authMiddleware';

const router = Router();

// router.use(authMiddleware);

router.get('/mrr', async (req: AuthRequest, res: Response) => {
    try {
        const data = await AnalyticsRepository.getMRR();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao processar dados financeiros' });
    }
});

export default router;
