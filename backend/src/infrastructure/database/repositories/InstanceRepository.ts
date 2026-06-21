import pool from '../database';
import { WhatsappInstance, WhatsappInstanceSettings, InstanceStatus } from '../../../domain/entities/WhatsappInstance';

export class InstanceRepository {
    public static async initTables(): Promise<void> {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_instances (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id VARCHAR(255) NOT NULL, -- link with configuracoes.instancia
                instance_name VARCHAR(255) NOT NULL UNIQUE,
                instance_token VARCHAR(255) NOT NULL UNIQUE,
                phone VARCHAR(50),
                status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
                active BOOLEAN DEFAULT true,
                last_connection_at TIMESTAMP,
                last_disconnect_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS whatsapp_instance_settings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE UNIQUE,
                always_online BOOLEAN DEFAULT false,
                reject_call BOOLEAN DEFAULT false,
                read_messages BOOLEAN DEFAULT false,
                ignore_groups BOOLEAN DEFAULT false,
                ignore_status BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
    }

    public static async create(data: Partial<WhatsappInstance>): Promise<WhatsappInstance> {
        const result = await pool.query(`
            INSERT INTO whatsapp_instances (tenant_id, instance_name, instance_token, status)
            VALUES ($1, $2, $3, $4) RETURNING *
        `, [data.tenant_id, data.instance_name, data.instance_token, data.status || 'PENDING']);
        return result.rows[0];
    }

    public static async updateStatus(instanceName: string, status: InstanceStatus): Promise<void> {
        let extraQuery = '';
        if (status === 'CONNECTED') extraQuery = ', last_connection_at = NOW()';
        if (status === 'DISCONNECTED' || status === 'LOGGED_OUT') extraQuery = ', last_disconnect_at = NOW()';
        
        await pool.query(`
            UPDATE whatsapp_instances 
            SET status = $1, updated_at = NOW() ${extraQuery}
            WHERE instance_name = $2
        `, [status, instanceName]);
    }

    public static async getByName(instanceName: string): Promise<WhatsappInstance | null> {
        const result = await pool.query('SELECT * FROM whatsapp_instances WHERE instance_name = $1', [instanceName]);
        return result.rows[0] || null;
    }

    public static async getByTenant(tenantId: string): Promise<WhatsappInstance[]> {
        const result = await pool.query('SELECT * FROM whatsapp_instances WHERE tenant_id = $1', [tenantId]);
        return result.rows;
    }

    public static async getSettings(instanceId: string): Promise<WhatsappInstanceSettings | null> {
        const result = await pool.query('SELECT * FROM whatsapp_instance_settings WHERE instance_id = $1', [instanceId]);
        return result.rows[0] || null;
    }

    public static async upsertSettings(instanceId: string, settings: Partial<WhatsappInstanceSettings>): Promise<void> {
        await pool.query(`
            INSERT INTO whatsapp_instance_settings (instance_id, always_online, reject_call, read_messages, ignore_groups, ignore_status)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (instance_id) DO UPDATE SET
                always_online = EXCLUDED.always_online,
                reject_call = EXCLUDED.reject_call,
                read_messages = EXCLUDED.read_messages,
                ignore_groups = EXCLUDED.ignore_groups,
                ignore_status = EXCLUDED.ignore_status,
                updated_at = NOW()
        `, [
            instanceId, settings.always_online || false, settings.reject_call || false, 
            settings.read_messages || false, settings.ignore_groups || false, settings.ignore_status || false
        ]);
    }

    public static async delete(instanceName: string): Promise<void> {
        await pool.query('DELETE FROM whatsapp_instances WHERE instance_name = $1', [instanceName]);
    }
}
