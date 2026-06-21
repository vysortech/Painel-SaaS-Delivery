import pool from '../database';
import { User } from '../../../domain/entities/User';
import bcrypt from 'bcryptjs';

export class UserRepository {
    public static async initTable(): Promise<void> {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS saas_users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE saas_users ADD COLUMN IF NOT EXISTS nome VARCHAR(255) DEFAULT 'Admin';
        `);

        const res = await pool.query('SELECT id FROM saas_users LIMIT 1');
        if (res.rowCount === 0) {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash('admin', salt);
            await pool.query('INSERT INTO saas_users (nome, username, password_hash) VALUES ($1, $2, $3)', ['Administrador', 'admin', hash]);
        }
    }

    public static async getAll(): Promise<Partial<User>[]> {
        const result = await pool.query('SELECT id, nome, username, created_at FROM saas_users ORDER BY id ASC');
        return result.rows;
    }

    public static async getByUsername(username: string): Promise<User | null> {
        const result = await pool.query('SELECT * FROM saas_users WHERE username = $1', [username]);
        return result.rows[0] || null;
    }

    public static async getById(id: number): Promise<User | null> {
        const result = await pool.query('SELECT * FROM saas_users WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    public static async create(nome: string, username: string, passwordHash: string): Promise<void> {
        await pool.query('INSERT INTO saas_users (nome, username, password_hash) VALUES ($1, $2, $3)', [nome || 'Admin', username, passwordHash]);
    }

    public static async update(id: number, nome: string, username: string, passwordHash?: string): Promise<void> {
        if (passwordHash) {
            await pool.query('UPDATE saas_users SET nome = $1, username = $2, password_hash = $3 WHERE id = $4', [nome, username, passwordHash, id]);
        } else {
            await pool.query('UPDATE saas_users SET nome = $1, username = $2 WHERE id = $3', [nome, username, id]);
        }
    }

    public static async delete(id: number): Promise<void> {
        await pool.query('DELETE FROM saas_users WHERE id = $1', [id]);
    }
}
