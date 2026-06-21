import { Router, Request, Response } from 'express';
import { AlertRepository } from '../../database/repositories/AlertRepository';
import { authMiddleware } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validateRequest';
import { webhookAlertSchema } from '../../../application/dtos/AlertSchemas';

const router = Router();

// Auto-migrate
AlertRepository.initTable().catch(console.error);

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

router.post('/webhook', validate(webhookAlertSchema), async (req: Request, res: Response) => {
    // Validate webhook secret if configured
    if (WEBHOOK_SECRET && req.headers['x-webhook-secret'] !== WEBHOOK_SECRET) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const { instancia, n8n_execution_id, node_name, error_message } = req.body;
    try {
        await AlertRepository.create(instancia, n8n_execution_id, node_name, error_message);
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro no banco de dados' });
    }
});

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
    try {
        const alerts = await AlertRepository.getRecent();
        res.json(alerts);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar alertas' });
    }
});

export default router;

