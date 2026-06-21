import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/UserRepository';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET não definido nas variáveis de ambiente!');
    process.exit(1);
}

// Auto-migrate tables
UserRepository.initTable().catch(console.error);

// --- PUBLIC ROUTES ---

router.post('/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username e password são obrigatórios' });
    }
    try {
        const user = await UserRepository.getByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password_hash || '');
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, username: user.username, nome: user.nome });
    } catch (err) {
        console.error('Erro no login:', err);
        res.status(500).json({ error: 'Erro interno do servidor. Tente novamente.' });
    }
});

// --- PROTECTED ROUTES (require JWT) ---

router.use(authMiddleware);

router.get('/users', async (req: Request, res: Response) => {
    try {
        const users = await UserRepository.getAll();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

router.post('/register', async (req: Request, res: Response) => {
    const { nome, username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username e password são obrigatórios' });
    }
    try {
        const userExists = await UserRepository.getByUsername(username);
        if (userExists) {
            return res.status(400).json({ error: 'Usuário já existe' });
        }
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        
        await UserRepository.create(nome, username, hash);
        res.status(201).json({ message: 'Usuário registrado com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: 'Erro no servidor ao registrar' });
    }
});

router.put('/users/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const { nome, username, password } = req.body;
    
    try {
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
            await UserRepository.update(id, nome, username, hash);
        } else {
            await UserRepository.update(id, nome, username);
        }
        res.json({ message: 'Usuário atualizado com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});

router.delete('/users/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    try {
        await UserRepository.delete(id);
        res.json({ message: 'Deletado com sucesso' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao deletar' });
    }
});

export default router;

