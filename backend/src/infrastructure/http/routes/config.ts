import { Router, Request, Response } from 'express';
import { ConfigRepository } from '../../database/repositories/ConfigRepository';
import { TenantConfig } from '../../../domain/entities/Config';
import crypto from 'crypto';
import { EvolutionService } from '../../external/EvolutionService';
import { authMiddleware } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validateRequest';
import { createTenantSchema, updateTenantSchema } from '../../../application/dtos/ConfigSchemas';

const router = Router();

// Auto-migrate
ConfigRepository.initTable().catch(console.error);

router.use(authMiddleware);

// Get all tenants
router.get('/', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 100;
        const offset = parseInt(req.query.offset as string) || 0;
        const tenants = await ConfigRepository.getAll(limit, offset);

        
        // Auto-generate tokens for legacy instances
        for (const tenant of tenants) {
            if (!tenant.connect_token) {
                const token = await ConfigRepository.generateTokenForLegacy(tenant.instancia);
                tenant.connect_token = token;
                tenant.status_conexao = 'PENDING';
            }
        }
        res.json(tenants);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar empresas', details: err.message });
    }
});

// Create new tenant
router.post('/', validate(createTenantSchema), async (req: Request, res: Response) => {
    const tenant: Partial<TenantConfig> = req.body;
    const connectToken = crypto.randomBytes(16).toString('hex');

    try {
        await ConfigRepository.create(tenant, connectToken);
        
        // Sync advanced settings with Evolution Go
        if (tenant.instancia) {
            await EvolutionService.createInstance(tenant.instancia);
            await EvolutionService.updateAdvancedSettings(tenant.instancia, {
                alwaysOnline: tenant.sempre_online,
                rejectCall: tenant.rejeitar_chamadas,
                readMessages: tenant.marcar_lidas,
                ignoreGroups: tenant.ignorar_grupos,
                ignoreStatus: tenant.ignorar_status
            });
        }

        res.status(201).json({ message: 'Tenant criado com sucesso', connect_token: connectToken });
    } catch (err: any) {
        console.error('ERRO INSERT:', err.message);
        res.status(500).json({ error: 'Erro ao criar empresa', details: err.message });
    }
});

// Update tenant
router.put('/:instancia', validate(updateTenantSchema), async (req: Request, res: Response) => {
    const { instancia } = req.params;
    const tenant: Partial<TenantConfig> = req.body;
    
    try {
        await ConfigRepository.update(instancia, tenant);

        // Sync advanced settings with Evolution Go
        await EvolutionService.updateAdvancedSettings(instancia, {
            alwaysOnline: tenant.sempre_online,
            rejectCall: tenant.rejeitar_chamadas,
            readMessages: tenant.marcar_lidas,
            ignoreGroups: tenant.ignorar_grupos,
            ignoreStatus: tenant.ignorar_status
        });

        res.json({ message: 'Tenant atualizado com sucesso' });
    } catch (err: any) {
        console.error('ERRO UPDATE:', err.message);
        res.status(500).json({ error: 'Erro ao atualizar empresa', details: err.message });
    }
});

router.post('/:instancia/logout', async (req: Request, res: Response) => {
    const { instancia } = req.params;
    try {
        await EvolutionService.logoutInstance(instancia);
        await ConfigRepository.update(instancia, { status_conexao: 'PENDING' });
        res.json({ message: 'Instância desconectada com sucesso' });
    } catch (err: any) {
        console.error('ERRO LOGOUT:', err.message);
        res.status(500).json({ error: 'Erro ao desconectar empresa', details: err.message });
    }
});

router.delete('/:instancia', async (req: Request, res: Response) => {
    const { instancia } = req.params;
    try {
        await ConfigRepository.delete(instancia);
        res.json({ message: 'Removida com sucesso' });
    } catch (err: any) {
        console.error('ERRO DELETE:', err.message);
        res.status(500).json({ error: 'Erro ao remover empresa', details: err.message });
    }
});

export default router;
