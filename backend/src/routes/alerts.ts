import { Router } from 'express';
import pool from '../db';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_saas_key';

router.post('/webhook', async (req, res) => {
    const { instancia, n8n_execution_id, node_name, error_message } = req.body;
    try {
        await pool.query(`
            INSERT INTO saas_erros (instancia, n8n_execution_id, node_name, error_message)
            VALUES ($1, $2, $3, $4)
        `, [instancia, n8n_execution_id, node_name, error_message]);
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro no banco de dados' });
    }
});

const authMiddleware = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acesso negado' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM saas_erros ORDER BY data_erro DESC LIMIT 50');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar alertas' });
    }
});

export default router;
