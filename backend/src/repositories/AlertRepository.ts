import pool from '../db';

export interface Alert {
    id: number;
    instancia: string;
    n8n_execution_id: string;
    node_name: string;
    error_message: string;
    data_erro: Date;
}

export class AlertRepository {
    public static async initTable(): Promise<void> {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS saas_erros (
                id SERIAL PRIMARY KEY,
                instancia VARCHAR(255),
                n8n_execution_id VARCHAR(255),
                node_name VARCHAR(255),
                error_message TEXT,
                data_erro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `).catch(console.error);
    }

    public static async create(instancia: string, executionId: string, nodeName: string, errorMsg: string): Promise<void> {
        await pool.query(`
            INSERT INTO saas_erros (instancia, n8n_execution_id, node_name, error_message)
            VALUES ($1, $2, $3, $4)
        `, [instancia, executionId, nodeName, errorMsg]);
    }

    public static async getRecent(): Promise<Alert[]> {
        const result = await pool.query('SELECT * FROM saas_erros ORDER BY data_erro DESC LIMIT 50');
        return result.rows as Alert[];
    }
}
