import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './infrastructure/http/routes/auth';
import configRoutes from './infrastructure/http/routes/config';
import alertsRoutes from './infrastructure/http/routes/alerts';
import evolutionRoutes from './infrastructure/http/routes/evolution';
import analyticsRoutes from './infrastructure/http/routes/analytics';
import settingsRoutes from './infrastructure/http/routes/settings';
import publicConnectRoutes from './infrastructure/http/routes/public_connect';
import { startBillingCron } from './infrastructure/cron/billing';
import { logger } from './shared/logger';
import { errorHandler } from './infrastructure/http/middlewares/errorHandler';
import pool from './infrastructure/database/database';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://food.vysortech.app.br',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-webhook-secret']
}));

// Global Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisições deste IP, tente novamente em 15 minutos.' }
});
app.use(limiter);

app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    logger.info({ method: req.method, url: req.url }, 'Incoming request');
    next();
});

// Health Check Route
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
    } catch (err) {
        logger.error({ err }, 'Health check database failed');
        res.status(500).json({ status: 'error', db: 'disconnected' });
    }
});

app.use('/api/auth', authRoutes);
app.use('/api/config', configRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/evolution', evolutionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/public/connect', publicConnectRoutes);

// Global Error Handler
app.use(errorHandler);

// Inicializa a cron de cobranças
startBillingCron();

const server = app.listen(PORT, () => {
    logger.info(`🚀 Backend SaaS Delivery rodando na porta ${PORT}`);
});

// --- Graceful Shutdown ---
function gracefulShutdown(signal: string) {
    logger.info(`Recebido ${signal}. Encerrando servidor HTTP...`);
    server.close(async () => {
        logger.info('Servidor HTTP encerrado.');
        try {
            await pool.end();
            logger.info('Pool de conexões com o PostgreSQL fechado.');
            process.exit(0);
        } catch (err) {
            logger.error({ err }, 'Erro ao fechar o pool do PostgreSQL');
            process.exit(1);
        }
    });

    // Se as requisições demorarem muito, força a parada após 10 segundos
    setTimeout(() => {
        logger.error('Forçando encerramento após timeout (10s).');
        process.exit(1);
    }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));


// Servir o Frontend Estático (quando compilado no Docker)
const frontendPath = path.join(__dirname, '../../frontend-dist');
if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

// Iniciar tarefas em segundo plano (Cron Jobs)
startBillingCron();

app.listen(PORT, () => {
    console.log(`🚀 Backend SaaS V3 rodando na porta ${PORT}`);
});
