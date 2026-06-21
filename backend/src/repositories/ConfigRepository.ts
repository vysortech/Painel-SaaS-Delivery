import pool from '../db';
import { TenantConfig } from '../interfaces/Config';
import crypto from 'crypto';

export class ConfigRepository {
    public static async initTable(): Promise<void> {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS configuracoes (
                instancia VARCHAR(255) PRIMARY KEY
            );
            ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS nome_empresa VARCHAR(255);
            ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS nome_admin VARCHAR(255);
            ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS telefone_admin VARCHAR(255);
            ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS telefone_whatsapp VARCHAR(255);
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
            ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS sempre_online BOOLEAN DEFAULT false;
            ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS rejeitar_chamadas BOOLEAN DEFAULT false;
            ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS marcar_lidas BOOLEAN DEFAULT false;
            ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS ignorar_grupos BOOLEAN DEFAULT false;
            ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS ignorar_status BOOLEAN DEFAULT false;
        `);
        // Fallback para colunas legadas
        await pool.query(`ALTER TABLE configuracoes ALTER COLUMN chave DROP NOT NULL;`).catch(() => {});
        await pool.query(`ALTER TABLE configuracoes ALTER COLUMN valor DROP NOT NULL;`).catch(() => {});
    }

    public static async getAll(): Promise<TenantConfig[]> {
        const result = await pool.query('SELECT * FROM configuracoes ORDER BY instancia ASC');
        return result.rows as TenantConfig[];
    }

    public static async getByInstance(instancia: string): Promise<TenantConfig | null> {
        const result = await pool.query('SELECT * FROM configuracoes WHERE instancia = $1', [instancia]);
        return result.rows[0] as TenantConfig || null;
    }

    public static async generateTokenForLegacy(instancia: string): Promise<string> {
        const token = crypto.randomBytes(16).toString('hex');
        await pool.query(
            'UPDATE configuracoes SET connect_token = $1, status_conexao = $2 WHERE instancia = $3', 
            [token, 'PENDING', instancia]
        );
        return token;
    }

    public static async create(tenant: Partial<TenantConfig>, connectToken: string): Promise<void> {
        await pool.query(`
            INSERT INTO configuracoes (
                instancia, nome_empresa, nome_admin, telefone_admin, telefone_whatsapp, chave_pix, nome_pix, 
                modelo_ia_cliente, modelo_ia_admin, nome_atendente, botoes_tempo, 
                valor_assinatura, data_vencimento, status_assinatura, plano_tipo, contexto_loja, dias_carencia,
                connect_token, status_conexao,
                sempre_online, rejeitar_chamadas, marcar_lidas, ignorar_grupos, ignorar_status
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        `, [
            tenant.instancia, tenant.nome_empresa, tenant.nome_admin, tenant.telefone_admin, tenant.telefone_whatsapp, tenant.chave_pix, tenant.nome_pix, 
            tenant.modelo_ia_cliente || '', tenant.modelo_ia_admin || '', tenant.nome_atendente, tenant.botoes_tempo, 
            tenant.valor_assinatura || 0, tenant.data_vencimento || null, tenant.status_assinatura || 'ativo', 
            tenant.plano_tipo || 'recorrente', tenant.contexto_loja || '', tenant.dias_carencia || 0,
            connectToken, 'PENDING',
            tenant.sempre_online || false, tenant.rejeitar_chamadas || false, tenant.marcar_lidas || false,
            tenant.ignorar_grupos || false, tenant.ignorar_status || false
        ]);
    }

    public static async update(instancia: string, tenant: Partial<TenantConfig>): Promise<void> {
        await pool.query(`
            UPDATE configuracoes SET 
                nome_empresa = $1, nome_admin = $2, telefone_admin = $3, telefone_whatsapp = $4, chave_pix = $5, nome_pix = $6, 
                modelo_ia_cliente = $7, modelo_ia_admin = $8, nome_atendente = $9, botoes_tempo = $10,
                valor_assinatura = $11, data_vencimento = $12, status_assinatura = $13, plano_tipo = $14, 
                contexto_loja = $15, dias_carencia = $16,
                sempre_online = $17, rejeitar_chamadas = $18, marcar_lidas = $19, ignorar_grupos = $20, ignorar_status = $21
            WHERE instancia = $22
        `, [
            tenant.nome_empresa, tenant.nome_admin, tenant.telefone_admin, tenant.telefone_whatsapp, tenant.chave_pix, tenant.nome_pix, 
            tenant.modelo_ia_cliente || '', tenant.modelo_ia_admin || '', tenant.nome_atendente, tenant.botoes_tempo,
            tenant.valor_assinatura, tenant.data_vencimento || null, tenant.status_assinatura, tenant.plano_tipo, 
            tenant.contexto_loja, tenant.dias_carencia, 
            tenant.sempre_online || false, tenant.rejeitar_chamadas || false, tenant.marcar_lidas || false, 
            tenant.ignorar_grupos || false, tenant.ignorar_status || false,
            instancia
        ]);
    }

    public static async updateConnectionStatusByToken(token: string, status: string): Promise<void> {
        await pool.query(
            'UPDATE configuracoes SET status_conexao = $1 WHERE connect_token = $2 OR instancia = $2',
            [status, token]
        );
    }

    public static async getByToken(token: string): Promise<TenantConfig | null> {
        let result = await pool.query('SELECT * FROM configuracoes WHERE connect_token = $1 OR instancia = $1', [token]);
        if (result.rows.length === 0) {
            result = await pool.query('SELECT * FROM configuracoes WHERE instancia = $1', [token]);
        }
        return result.rows[0] as TenantConfig || null;
    }

    public static async delete(instancia: string): Promise<void> {
        await pool.query('DELETE FROM configuracoes WHERE instancia=$1', [instancia]);
    }
}
