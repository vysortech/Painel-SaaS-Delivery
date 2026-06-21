import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../../shared/logger';

// Conexão unificada do Redis para filas
export const redisConnection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null,
});

redisConnection.on('error', (err) => {
    logger.error({ err }, 'Redis connection error');
});

// Fila principal de processamento de webhooks
export const webhookQueue = new Queue('evolution-webhooks', {
    connection: redisConnection as any,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    }
});

export const webhookQueueEvents = new QueueEvents('evolution-webhooks', { connection: redisConnection as any });

webhookQueueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error({ jobId, failedReason }, 'Job falhou na fila de webhooks');
});
