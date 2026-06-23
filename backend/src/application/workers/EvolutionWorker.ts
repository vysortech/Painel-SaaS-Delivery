import { Worker } from 'bullmq';
import { redisConnection } from '../../infrastructure/queue/QueueManager';
import { WebhookLogsRepository } from '../../infrastructure/database/repositories/WebhookLogsRepository';
import { InstanceRepository } from '../../infrastructure/database/repositories/InstanceRepository';
import { SocketServer } from '../../infrastructure/websocket/SocketServer';
import { logger } from '../../shared/logger';
import { InstanceStatus } from '../../domain/entities/WhatsappInstance';

export const evolutionWorker = new Worker('evolution-webhooks', async job => {
    const { event, instance, data, tenantId, logId } = job.data;
    logger.info({ event, instance, jobId: job.id }, 'Processando evento de webhook da Evolution');

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
            let pairingCode = data.qrcode?.pairingCode || data.pairingCode || null;
            if (!pairingCode) {
                const c = data.qrcode?.code || data.code;
                if (c && c.length <= 15) pairingCode = c;
            }
            SocketServer.emitToTenant(tenantId, 'qrcode.updated', {
                instance,
                base64: qrBase64,
                pairingCode: pairingCode
            });
        }
        else if (event === 'MESSAGES_UPSERT') {
            // Em uma arquitetura real N8N, aqui nós engatilharíamos o Webhook do N8N ou jogaríamos numa fila do RabbitMQ pro N8N
            // Por enquanto vamos apenas simular que processamos com sucesso.
            logger.info({ instance, messagesCount: data.messages?.length }, 'Mensagens recebidas, encaminhando para processamento do N8N...');
            SocketServer.emitToTenant(tenantId, 'message.received', data.messages);
        }

        await WebhookLogsRepository.markProcessed(logId);
        logger.info({ jobId: job.id }, 'Evento processado com sucesso');
    } catch (err: any) {
        await WebhookLogsRepository.markProcessed(logId, err.message);
        throw err; // Joga o erro pro BullMQ fazer o Retry
    }
}, { connection: redisConnection as any });
