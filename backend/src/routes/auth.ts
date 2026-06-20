import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_saas_key';

// Auto-migrate tables
pool.query(`
  CREATE TABLE IF NOT EXISTS saas_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ALTER TABLE saas_users ADD COLUMN IF NOT EXISTS nome VARCHAR(255) DEFAULT 'Admin';
`).then(async () => {
    // Inject default admin if none exist
    const res = await pool.query('SELECT id FROM saas_users LIMIT 1');
    if (res.rowCount === 0) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('admin', salt);
        await pool.query('INSERT INTO saas_users (nome, username, password_hash) VALUES ($1, $2, $3)', ['Administrador', 'admin', hash]);
    }
}).catch(console.error);

router.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nome, username, created_at FROM saas_users ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

router.post('/register', async (req, res) => {
    const { nome, username, password } = req.body;
    try {
        const userExists = await pool.query('SELECT id FROM saas_users WHERE username = $1', [username]);
        if (userExists.rowCount && userExists.rowCount > 0) {
            return res.status(400).json({ error: 'Usuário já existe' });
        }
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        await pool.query('INSERT INTO saas_users (nome, username, password_hash) VALUES ($1, $2, $3)', [nome || 'Admin', username, hash]);
        res.status(201).json({ message: 'Usuário registrado com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

router.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, username, password } = req.body;
    try {
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
            await pool.query('UPDATE saas_users SET nome = $1, username = $2, password_hash = $3 WHERE id = $4', [nome, username, hash, id]);
        } else {
            await pool.query('UPDATE saas_users SET nome = $1, username = $2 WHERE id = $3', [nome, username, id]);
        }
        res.json({ message: 'Usuário atualizado com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM saas_users WHERE username = $1', [username]);
        if (result.rowCount === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, username: user.username, nome: user.nome });
    } catch (err) {
        // MODO OFFLINE / DEV BYPASS: Se a VPS rejeitar a conexão (ECONNREFUSED)
        if (username === 'admin' && password === 'admin') {
            const token = jwt.sign({ id: 0, username: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
            return res.json({ token, username: 'admin', nome: 'Administrador (Modo Offline)' });
        }
        res.status(500).json({ error: 'Erro no servidor (A VPS recusou a conexão)' });
    }
});

router.delete('/users/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM saas_users WHERE id = $1', [req.params.id]);
        res.json({ message: 'Deletado com sucesso' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao deletar' });
    }
});

export default router;
