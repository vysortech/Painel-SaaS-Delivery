import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import configRoutes from './routes/config';
import analyticsRoutes from './routes/analytics';
import alertsRoutes from './routes/alerts';
import settingsRoutes from './routes/settings';
import evolutionRoutes from './routes/evolution';
import publicConnectRoutes from './routes/public_connect';
import { startBillingCron } from './cron/billing';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/config', configRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/evolution', evolutionRoutes);
app.use('/api/public/whatsapp', publicConnectRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'saas-panel-api-v3' });
});

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
