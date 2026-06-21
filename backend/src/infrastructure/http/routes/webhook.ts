import { Router, Request, Response } from 'express';
import { WebhookLogsRepository } from '../../database/repositories/WebhookLogsRepository';
import { InstanceRepository } from '../../database/repositories/InstanceRepository';
import { SocketServer } from '../../websocket/SocketServer';
import { logger } from '../../../shared/logger';
import { InstanceStatus } from '../../../domain/entities/WhatsappInstance';

const router = Router();

const verifyHmac = (req: Request, res: Response, next: any) => {
    next();
};

router.post('/', verifyHmac, async (req: Request, res: Response) => {
    // 1. Responder imediatamente para não prender a Evolution API
    res.status(200).json({ success: true });

    try {
        const payload = req.body;
        const event = payload.event;
        const instance = payload.instance;

        if (!event || !instance) {
            return;
        }

        const instanceDb = await InstanceRepository.getByName(instance);
        const tenantId = instanceDb?.tenant_id || 'unknown';

        const logId = await WebhookLogsRepository.logWebhook(instanceDb?.id || null, event, payload);
        const data = payload.data || payload;

        try {
            if (event === 'CONNECTION_UPDATE') {
                const state = data.state || data.instance?.state;
                let newStatus: InstanceStatus = 'PENDING';
                
                if (state === 'open') newStatus = 'CONNECTED';
                else if (state === 'connecting') newStatus = 'CONNECTING';
                else if (state === 'close') newStatus = 'DISCONNECTED';
                else if (state === 'refused') newStatus = 'ERROR';
                
                await InstanceRepository.updateStatus(instance, newStatus);
                await WebhookLogsRepository.logConnection(instance, 'UNKNOWN', newStatus, data);
                
                SocketServer.emitToTenant(tenantId, 'instance.connection_update', {
                    instance,
                    status: newStatus,
                    state
                });
            }
            else if (event === 'QRCODE_UPDATED') {
                const qrBase64 = data.qrcode?.base64 || data.base64;
                SocketServer.emitToTenant(tenantId, 'qrcode.updated', {
                    instance,
                    base64: qrBase64
                });
            }
            else if (event === 'MESSAGES_UPSERT') {
                SocketServer.emitToTenant(tenantId, 'message.received', data.messages);
            }

            await WebhookLogsRepository.markProcessed(logId);
        } catch (err: any) {
            await WebhookLogsRepository.markProcessed(logId, err.message);
            logger.error({ err }, 'Erro interno ao processar webhook sincrono');
        }

    } catch (err: any) {
        logger.error({ err }, 'Erro ao receber Webhook');
    }
});

export default router;
