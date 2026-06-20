import { Router } from 'express';
import pool from '../db';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_saas_key';

const authMiddleware = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acesso negado' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

// router.use(authMiddleware);

router.get('/mrr', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                status_assinatura, 
                COUNT(*) as count, 
                SUM(valor_assinatura) as total_revenue 
            FROM configuracoes 
            GROUP BY status_assinatura
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao processar dados financeiros' });
    }
});

export default router;
