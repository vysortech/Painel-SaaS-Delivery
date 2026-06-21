import { Router, Request, Response } from 'express';
import { webhookQueue } from '../../queue/QueueManager';
import { WebhookLogsRepository } from '../../database/repositories/WebhookLogsRepository';
import { InstanceRepository } from '../../database/repositories/InstanceRepository';
import { logger } from '../../../shared/logger';
import crypto from 'crypto';

const router = Router();

// Middleware de validação HMAC (Opcional dependendo se a Evolution enviou a assinatura)
const verifyHmac = (req: Request, res: Response, next: any) => {
    // Para simplificar a implementação local/teste, vamos deixar o HMAC passivo.
    // Em produção estrita, comparar X-Hub-Signature.
    next();
};

router.post('/', verifyHmac, async (req: Request, res: Response) => {
    try {
        const payload = req.body;
        const event = payload.event;
        const instance = payload.instance;

        if (!event || !instance) {
            return res.status(400).json({ error: 'Payload inválido' });
        }

        // Recupera tenant_id do banco
        const instanceDb = await InstanceRepository.getByName(instance);
        const tenantId = instanceDb?.tenant_id || 'unknown';

        // 1. Gravar no banco de logs
        const logId = await WebhookLogsRepository.logWebhook(instanceDb?.id || null, event, payload);

        // 2. Jogar na fila (Desacopla a resposta HTTP do processamento pesado)
        await webhookQueue.add('evolution_event', {
            event,
            instance,
            data: payload.data || payload,
            tenantId,
            logId
        });

        // 3. Responder imediatamente com HTTP 200 para a Evolution
        res.status(200).json({ success: true });
    } catch (err: any) {
        logger.error({ err }, 'Erro ao receber Webhook');
        res.status(500).json({ error: 'Erro interno' });
    }
});

export default router;
