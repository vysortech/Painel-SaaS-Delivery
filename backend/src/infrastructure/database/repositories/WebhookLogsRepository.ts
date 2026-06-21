import pool from '../database';

export class WebhookLogsRepository {
    public static async initTables(): Promise<void> {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_webhook_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                instance_id UUID,
                event VARCHAR(255) NOT NULL,
                payload JSONB NOT NULL,
                processed BOOLEAN DEFAULT false,
                error TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS whatsapp_connection_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                instance_id UUID,
                old_status VARCHAR(50),
                new_status VARCHAR(50),
                payload JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
    }

    public static async logWebhook(instanceId: string | null, event: string, payload: any): Promise<string> {
        const result = await pool.query(`
            INSERT INTO whatsapp_webhook_logs (instance_id, event, payload)
            VALUES ($1, $2, $3) RETURNING id
        `, [instanceId, event, payload]);
        return result.rows[0].id;
    }

    public static async markProcessed(logId: string, error?: string): Promise<void> {
        await pool.query(`
            UPDATE whatsapp_webhook_logs 
            SET processed = true, error = $2 
            WHERE id = $1
        `, [logId, error || null]);
    }

    public static async logConnection(instanceId: string, oldStatus: string, newStatus: string, payload: any): Promise<void> {
        await pool.query(`
            INSERT INTO whatsapp_connection_logs (instance_id, old_status, new_status, payload)
            VALUES ($1, $2, $3, $4)
        `, [instanceId, oldStatus, newStatus, payload]);
    }
}
