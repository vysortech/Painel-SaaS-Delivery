import pool from '../db';
import { GlobalSettings } from '../interfaces/GlobalSettings';

export class GlobalSettingsRepository {
    public static async initTable(): Promise<void> {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS saas_global_settings (
                id SERIAL PRIMARY KEY,
                prompt_cliente TEXT,
                prompt_admin TEXT,
                custo_por_token DECIMAL(10,7)
            );
            ALTER TABLE saas_global_settings ADD COLUMN IF NOT EXISTS modelo_ia_cliente VARCHAR(255) DEFAULT 'google/gemma-4-31b-it';
            ALTER TABLE saas_global_settings ADD COLUMN IF NOT EXISTS modelo_ia_admin VARCHAR(255) DEFAULT 'deepseek/deepseek-v4-flash';
            ALTER TABLE saas_global_settings ADD COLUMN IF NOT EXISTS custo_token_entrada_cliente DECIMAL(10,7) DEFAULT 0.0001;
            ALTER TABLE saas_global_settings ADD COLUMN IF NOT EXISTS custo_token_saida_cliente DECIMAL(10,7) DEFAULT 0.0001;
            ALTER TABLE saas_global_settings ADD COLUMN IF NOT EXISTS custo_token_entrada_admin DECIMAL(10,7) DEFAULT 0.0001;
            ALTER TABLE saas_global_settings ADD COLUMN IF NOT EXISTS custo_token_saida_admin DECIMAL(10,7) DEFAULT 0.0001;
            ALTER TABLE saas_global_settings ADD COLUMN IF NOT EXISTS evolution_api_url VARCHAR(255);
            ALTER TABLE saas_global_settings ADD COLUMN IF NOT EXISTS evolution_api_key VARCHAR(255);
        `).catch(console.error);
    }

    public static async get(): Promise<GlobalSettings> {
        const result = await pool.query('SELECT * FROM saas_global_settings LIMIT 1');
        if (result.rowCount === 0) {
            await pool.query(`INSERT INTO saas_global_settings (prompt_cliente, prompt_admin, custo_por_token) VALUES ('', '', 0.0001)`);
            const newRes = await pool.query('SELECT * FROM saas_global_settings LIMIT 1');
            return newRes.rows[0] as GlobalSettings;
        }
        return result.rows[0] as GlobalSettings;
    }

    public static async save(settings: Partial<GlobalSettings>): Promise<void> {
        const result = await pool.query('SELECT id FROM saas_global_settings LIMIT 1');
        if (result.rowCount === 0) {
            await pool.query(`
                INSERT INTO saas_global_settings (
                    prompt_cliente, prompt_admin, 
                    modelo_ia_cliente, modelo_ia_admin,
                    custo_token_entrada_cliente, custo_token_saida_cliente,
                    custo_token_entrada_admin, custo_token_saida_admin,
                    evolution_api_url, evolution_api_key
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                settings.prompt_cliente || '', settings.prompt_admin || '', 
                settings.modelo_ia_cliente || '', settings.modelo_ia_admin || '',
                settings.custo_token_entrada_cliente || 0, settings.custo_token_saida_cliente || 0,
                settings.custo_token_entrada_admin || 0, settings.custo_token_saida_admin || 0,
                settings.evolution_api_url || '', settings.evolution_api_key || ''
            ]);
        } else {
            await pool.query(`
                UPDATE saas_global_settings SET 
                    prompt_cliente=$1, prompt_admin=$2,
                    modelo_ia_cliente=$3, modelo_ia_admin=$4,
                    custo_token_entrada_cliente=$5, custo_token_saida_cliente=$6,
                    custo_token_entrada_admin=$7, custo_token_saida_admin=$8,
                    evolution_api_url=$9, evolution_api_key=$10
                WHERE id=$11
            `, [
                settings.prompt_cliente || '', settings.prompt_admin || '', 
                settings.modelo_ia_cliente || '', settings.modelo_ia_admin || '',
                settings.custo_token_entrada_cliente || 0, settings.custo_token_saida_cliente || 0,
                settings.custo_token_entrada_admin || 0, settings.custo_token_saida_admin || 0,
                settings.evolution_api_url || '', settings.evolution_api_key || '',
                result.rows[0].id
            ]);
        }
    }
}
