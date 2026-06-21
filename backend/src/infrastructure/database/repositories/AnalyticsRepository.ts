import pool from '../database';

export interface MRRStats {
    status_assinatura: string;
    count: string; // COUNT no postgres retorna string em js
    total_revenue: string; // SUM no postgres retorna string
}

export class AnalyticsRepository {
    public static async getMRR(): Promise<MRRStats[]> {
        const result = await pool.query(`
            SELECT 
                status_assinatura, 
                COUNT(*) as count, 
                SUM(valor_assinatura) as total_revenue 
            FROM configuracoes 
            GROUP BY status_assinatura
        `);
        return result.rows as MRRStats[];
    }
}
