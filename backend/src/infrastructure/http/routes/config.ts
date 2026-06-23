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

        // Sync em tempo real com Evolution (Fast fetch de /instance/all)
        // Resolve o problema do painel ficar com status desatualizado pois o webhook vai para o n8n
        try {
            const { EvolutionService } = await import('../../external/EvolutionService');
            const { InstanceRepository } = await import('../../database/repositories/InstanceRepository');
            const statusMap = await EvolutionService.syncAllInstancesStatus();
            
            for (const tenant of tenants) {
                if (statusMap[tenant.instancia]) {
                    const isConnected = statusMap[tenant.instancia] === 'CONNECTED';
                    const newStatus = isConnected ? 'CONNECTED' : 'DISCONNECTED';
                    
                    // Atualiza apenas se for diferente
                    if (tenant.status_conexao !== newStatus) {
                        tenant.status_conexao = newStatus;
                        // Atualiza no banco asíncronamente sem travar a requisição
                        InstanceRepository.updateStatus(tenant.instancia, newStatus).catch(() => {});
                    }
                } else if (tenant.status_conexao !== 'PENDING') {
                    tenant.status_conexao = 'DISCONNECTED';
                }
            }
        } catch(e: any) {
            console.error('Falha ao sincronizar status ao vivo', e.message);
        }

        // Auto-generate tokens for legacy instances
        for (const tenant of tenants) {
            if (!tenant.connect_token) {
                const token = await ConfigRepository.generateTokenForLegacy(tenant.instancia);
                tenant.connect_token = token;
                if (tenant.status_conexao !== 'CONNECTED') {
                    tenant.status_conexao = 'PENDING';
                }
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
        
        // We no longer sync with Evolution Go during POST/PUT.
        // We will sync when the user clicks 'Connect' to avoid creating the instance too early and breaking the pairing code timeout.

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

        // We no longer sync with Evolution Go during POST/PUT.
        // We will sync when the user clicks 'Connect' to avoid creating the instance too early and breaking the pairing code timeout.

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
        await ConfigRepository.updateConnectionStatus(instancia, 'PENDING');
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
