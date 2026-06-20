import pool from '../db';

export class AnalyticsRepository {
    public static async getMRR(): Promise<any[]> {
        const result = await pool.query(`
            SELECT 
                status_assinatura, 
                COUNT(*) as count, 
                SUM(valor_assinatura) as total_revenue 
            FROM configuracoes 
            GROUP BY status_assinatura
        `);
        return result.rows;
    }
}
