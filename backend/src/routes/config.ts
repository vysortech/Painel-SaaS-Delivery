import { Router } from 'express';
import pool from '../db';

const router = Router();

// Auto-migrate
pool.query(`
  ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS plano_tipo VARCHAR(50) DEFAULT 'recorrente';
  ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS contexto_loja TEXT DEFAULT '';
  ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS dias_carencia INT DEFAULT 0;
`).catch(console.error);

// Get all tenants
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM configuracoes ORDER BY instancia ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar empresas' });
    }
});

// Create new tenant
router.post('/', async (req, res) => {
    const { 
        instancia, nome_empresa, nome_admin, telefone_admin, chave_pix, nome_pix, 
        modelo_ia_cliente, modelo_ia_admin, nome_atendente, botoes_tempo, 
        valor_assinatura, data_vencimento, status_assinatura, plano_tipo, contexto_loja, dias_carencia
    } = req.body;
    try {
        await pool.query(`
            INSERT INTO configuracoes (
                instancia, nome_empresa, nome_admin, telefone_admin, chave_pix, nome_pix, 
                modelo_ia_cliente, modelo_ia_admin, nome_atendente, botoes_tempo, 
                valor_assinatura, data_vencimento, status_assinatura, plano_tipo, contexto_loja, dias_carencia
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
            instancia, nome_empresa, nome_admin, telefone_admin, chave_pix, nome_pix, 
            modelo_ia_cliente, modelo_ia_admin, nome_atendente, botoes_tempo, 
            valor_assinatura || 0, data_vencimento || null, status_assinatura || 'ativo', plano_tipo || 'recorrente', contexto_loja || '', dias_carencia || 0
        ]);
        res.status(201).json({ message: 'Tenant criado com sucesso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar empresa' });
    }
});

// Update tenant
router.put('/:instancia', async (req, res) => {
    const { instancia } = req.params;
    const { 
        nome_empresa, nome_admin, telefone_admin, chave_pix, nome_pix, 
        modelo_ia_cliente, modelo_ia_admin, nome_atendente, botoes_tempo, 
        valor_assinatura, data_vencimento, status_assinatura, plano_tipo, contexto_loja, dias_carencia
    } = req.body;
    try {
        await pool.query(`
            UPDATE configuracoes SET 
                nome_empresa = $1, nome_admin = $2, telefone_admin = $3, chave_pix = $4, nome_pix = $5, 
                modelo_ia_cliente = $6, modelo_ia_admin = $7, nome_atendente = $8, botoes_tempo = $9,
                valor_assinatura = $10, data_vencimento = $11, status_assinatura = $12, plano_tipo = $13, contexto_loja = $14, dias_carencia = $15
            WHERE instancia = $16
        `, [
            nome_empresa, nome_admin, telefone_admin, chave_pix, nome_pix, 
            modelo_ia_cliente, modelo_ia_admin, nome_atendente, botoes_tempo,
            valor_assinatura, data_vencimento, status_assinatura, plano_tipo, contexto_loja, dias_carencia, instancia
        ]);
        res.json({ message: 'Tenant atualizado com sucesso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar empresa' });
    }
});

router.delete('/:instancia', async (req, res) => {
    const { instancia } = req.params;
    try {
        await pool.query('DELETE FROM configuracoes WHERE instancia=$1', [instancia]);
        res.json({ message: 'Removida com sucesso' });
    } catch (err) {
        res.status(500).json({ error: 'Erro' });
    }
});

export default router;
