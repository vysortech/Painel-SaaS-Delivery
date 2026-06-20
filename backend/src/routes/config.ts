import { Router } from 'express';
import pool from '../db';

const router = Router();

// Auto-migrate completo para garantir que a tabela e as colunas existam
pool.query(`
  CREATE TABLE IF NOT EXISTS configuracoes (
      instancia VARCHAR(255) PRIMARY KEY
  );
  ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS nome_empresa VARCHAR(255);
  ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS nome_admin VARCHAR(255);
  ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS telefone_admin VARCHAR(255);
  ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS chave_pix VARCHAR(255);
  ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS nome_pix VARCHAR(255);
  ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS modelo_ia_cliente VARCHAR(50);
  ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS modelo_ia_admin VARCHAR(50);
  ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS nome_atendente VARCHAR(100);
  ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS botoes_tempo VARCHAR(255);
  ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS valor_assinatura NUMERIC(10,2);
  ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS data_vencimento DATE;
  ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS status_assinatura VARCHAR(50);
  ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS plano_tipo VARCHAR(50) DEFAULT 'recorrente';
  ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS contexto_loja TEXT DEFAULT '';
  ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS dias_carencia INT DEFAULT 0;
  ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS connect_token VARCHAR(255);
  ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS status_conexao VARCHAR(50) DEFAULT 'PENDING';
`).catch(console.error);

// Tenta remover a constraint NOT NULL da coluna chave separadamente, pois se ela não existir, o erro será ignorado sem quebrar o resto.
pool.query(`ALTER TABLE configuracoes ALTER COLUMN chave DROP NOT NULL;`).catch(() => {});
// Idem para a coluna valor antiga
pool.query(`ALTER TABLE configuracoes ALTER COLUMN valor DROP NOT NULL;`).catch(() => {});

// Get all tenants
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM configuracoes ORDER BY instancia ASC');
        const crypto = require('crypto');
        
        // Auto-generate tokens for legacy instances
        for (const row of result.rows) {
            if (!row.connect_token) {
                const token = crypto.randomBytes(16).toString('hex');
                await pool.query('UPDATE configuracoes SET connect_token = $1, status_conexao = $2 WHERE instancia = $3', [token, 'PENDING', row.instancia]);
                row.connect_token = token;
                row.status_conexao = 'PENDING';
            }
        }
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
    
    // Gera token para a página pública
    const crypto = require('crypto');
    const connectToken = crypto.randomBytes(16).toString('hex');

    try {
        await pool.query(`
            INSERT INTO configuracoes (
                instancia, nome_empresa, nome_admin, telefone_admin, chave_pix, nome_pix, 
                modelo_ia_cliente, modelo_ia_admin, nome_atendente, botoes_tempo, 
                valor_assinatura, data_vencimento, status_assinatura, plano_tipo, contexto_loja, dias_carencia,
                connect_token, status_conexao
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        `, [
            instancia, nome_empresa, nome_admin, telefone_admin, chave_pix, nome_pix, 
            modelo_ia_cliente || '', modelo_ia_admin || '', nome_atendente, botoes_tempo, 
            valor_assinatura || 0, data_vencimento || null, status_assinatura || 'ativo', plano_tipo || 'recorrente', contexto_loja || '', dias_carencia || 0,
            connectToken, 'PENDING'
        ]);
        res.status(201).json({ message: 'Tenant criado com sucesso' });
    } catch (err: any) {
        console.error('ERRO INSERT:', err.message);
        res.status(500).json({ error: 'Erro ao criar empresa', details: err.message });
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
            modelo_ia_cliente || '', modelo_ia_admin || '', nome_atendente, botoes_tempo,
            valor_assinatura, data_vencimento || null, status_assinatura, plano_tipo, contexto_loja, dias_carencia, instancia
        ]);
        res.json({ message: 'Tenant atualizado com sucesso' });
    } catch (err: any) {
        console.error('ERRO UPDATE:', err.message);
        res.status(500).json({ error: 'Erro ao atualizar empresa', details: err.message });
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
