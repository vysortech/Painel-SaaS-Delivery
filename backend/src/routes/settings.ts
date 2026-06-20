import { Router } from 'express';
import pool from '../db';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_saas_key';

const authMiddleware = (req: any, res: any, next: any) => {
    next();
};

router.use(authMiddleware);

// Auto-migrate saas_global_settings with new advanced fields
pool.query(`
  ALTER TABLE saas_global_settings ADD COLUMN IF NOT EXISTS modelo_ia_cliente VARCHAR(255) DEFAULT 'google/gemma-4-31b-it';
  ALTER TABLE saas_global_settings ADD COLUMN IF NOT EXISTS modelo_ia_admin VARCHAR(255) DEFAULT 'deepseek/deepseek-v4-flash';
  ALTER TABLE saas_global_settings ADD COLUMN IF NOT EXISTS custo_token_entrada_cliente DECIMAL(10,7) DEFAULT 0.0001;
  ALTER TABLE saas_global_settings ADD COLUMN IF NOT EXISTS custo_token_saida_cliente DECIMAL(10,7) DEFAULT 0.0001;
  ALTER TABLE saas_global_settings ADD COLUMN IF NOT EXISTS custo_token_entrada_admin DECIMAL(10,7) DEFAULT 0.0001;
  ALTER TABLE saas_global_settings ADD COLUMN IF NOT EXISTS custo_token_saida_admin DECIMAL(10,7) DEFAULT 0.0001;
`).catch(console.error);

// Get global settings
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM saas_global_settings LIMIT 1');
        if (result.rowCount === 0) {
            await pool.query(`INSERT INTO saas_global_settings (prompt_cliente, prompt_admin, custo_por_token) VALUES ('', '', 0.0001)`);
            const newRes = await pool.query('SELECT * FROM saas_global_settings LIMIT 1');
            return res.json(newRes.rows[0]);
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar configurações globais' });
    }
});

// Update global settings
router.put('/', async (req, res) => {
    const { 
        prompt_cliente, prompt_admin, 
        modelo_ia_cliente, modelo_ia_admin,
        custo_token_entrada_cliente, custo_token_saida_cliente,
        custo_token_entrada_admin, custo_token_saida_admin
    } = req.body;
    
    try {
        const result = await pool.query('SELECT id FROM saas_global_settings LIMIT 1');
        if (result.rowCount === 0) {
            await pool.query(`
                INSERT INTO saas_global_settings (
                    prompt_cliente, prompt_admin, 
                    modelo_ia_cliente, modelo_ia_admin,
                    custo_token_entrada_cliente, custo_token_saida_cliente,
                    custo_token_entrada_admin, custo_token_saida_admin
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                prompt_cliente, prompt_admin, 
                modelo_ia_cliente, modelo_ia_admin,
                custo_token_entrada_cliente, custo_token_saida_cliente,
                custo_token_entrada_admin, custo_token_saida_admin
            ]);
        } else {
            await pool.query(`
                UPDATE saas_global_settings SET 
                    prompt_cliente=$1, prompt_admin=$2,
                    modelo_ia_cliente=$3, modelo_ia_admin=$4,
                    custo_token_entrada_cliente=$5, custo_token_saida_cliente=$6,
                    custo_token_entrada_admin=$7, custo_token_saida_admin=$8
                WHERE id=$9
            `, [
                prompt_cliente, prompt_admin, 
                modelo_ia_cliente, modelo_ia_admin,
                custo_token_entrada_cliente, custo_token_saida_cliente,
                custo_token_entrada_admin, custo_token_saida_admin,
                result.rows[0].id
            ]);
        }
        res.json({ message: 'Configurações globais salvas' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
});

export default router;
