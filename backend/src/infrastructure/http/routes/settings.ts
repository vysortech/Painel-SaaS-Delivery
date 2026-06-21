import { Router, Request, Response } from 'express';
import { GlobalSettingsRepository } from '../../database/repositories/GlobalSettingsRepository';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Auto-migrate
GlobalSettingsRepository.initTable().catch(console.error);

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
    try {
        const settings = await GlobalSettingsRepository.get();
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar configurações globais' });
    }
});

router.put('/', async (req: Request, res: Response) => {
    try {
        await GlobalSettingsRepository.save(req.body);
        res.json({ message: 'Configurações globais salvas' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
});

export default router;
