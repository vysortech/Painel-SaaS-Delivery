import { Router, Request, Response } from 'express';
import { EvolutionService } from '../../external/EvolutionService';
import { InstanceRepository } from '../../database/repositories/InstanceRepository';
import { authMiddleware } from '../middlewares/authMiddleware';
import { logger } from '../../../shared/logger';

const router = Router();
router.use(authMiddleware);

// GET /instances
router.get('/instances', async (req: Request, res: Response) => {
    try {
        const tenantId = req.query.tenant_id as string;
        const instances = tenantId 
            ? await InstanceRepository.getByTenant(tenantId)
            : await InstanceRepository.getByTenant('all'); // Simplificação: no mundo real haveria filtro por owner
        res.json(instances);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// POST /instances/:id/connect
router.post('/instances/:instanceName/connect', async (req: Request, res: Response) => {
    try {
        const { instanceName } = req.params;
        let instance = await InstanceRepository.getByName(instanceName);
        
        if (!instance) {
            // Auto-create local e remoto se não existir
            // Pega tenantId via query só pra teste ou auth
            const tenantId = req.query.tenant_id as string || 'default';
            instance = await InstanceRepository.create({ tenant_id: tenantId, instance_name: instanceName, instance_token: instanceName, status: 'PENDING' });
            await EvolutionService.createInstance(instanceName);
        }

        await EvolutionService.connectInstance(instanceName);
        
        // Em vez de segurar a requisição, retornamos OK. 
        // O QRCode virá pelo WebSocket via fila (BullMQ).
        res.json({ success: true, message: 'Processo de conexão iniciado. Escute o websocket para o QRCode.' });
    } catch (err: any) {
        logger.error({ err }, 'Erro ao conectar instância');
        res.status(500).json({ error: 'Erro ao iniciar conexão' });
    }
});

// POST /instances/:id/disconnect
router.post('/instances/:instanceName/disconnect', async (req: Request, res: Response) => {
    try {
        const { instanceName } = req.params;
        await EvolutionService.logoutInstance(instanceName);
        // O status real virá via webhook. Vamos assumir um update otimista:
        await InstanceRepository.updateStatus(instanceName, 'LOGGED_OUT');
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: 'Erro ao desconectar' });
    }
});

// DELETE /instances/:id
router.delete('/instances/:instanceName', async (req: Request, res: Response) => {
    try {
        const { instanceName } = req.params;
        await EvolutionService.deleteInstance(instanceName);
        await InstanceRepository.delete(instanceName);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: 'Erro ao excluir' });
    }
});

// GET /instances/:id/settings
router.get('/instances/:instanceId/settings', async (req: Request, res: Response) => {
    try {
        const { instanceId } = req.params; // instanceId here is instance_name
        let instance = await InstanceRepository.getByName(instanceId);
        if (!instance) {
            return res.json({});
        }

        let settings = await InstanceRepository.getSettings(instance.id);
        if (!settings) {
            settings = { 
                id: 'new', instance_id: instance.id, 
                always_online: false, reject_call: false, read_messages: false, 
                ignore_groups: false, ignore_status: false, 
                created_at: new Date(), updated_at: new Date()
            };
        }
        res.json(settings);
    } catch (err: any) {
        res.status(500).json({ error: 'Erro ao buscar settings' });
    }
});

// PUT /instances/:id/settings
router.put('/instances/:instanceId/settings', async (req: Request, res: Response) => {
    try {
        const { instanceId } = req.params; // instanceId is instance_name
        const body = req.body;
        
        let instance = await InstanceRepository.getByName(instanceId);
        if (!instance) {
            instance = await InstanceRepository.create({
                tenant_id: instanceId, // using instanceName as fallback tenant
                instance_name: instanceId,
                instance_token: instanceId,
                status: 'PENDING'
            });
            await EvolutionService.createInstance(instanceId).catch(() => {});
        }

        await InstanceRepository.upsertSettings(instance.id, body);
        
        await EvolutionService.updateAdvancedSettings(instanceId, {
            alwaysOnline: body.always_online,
            rejectCall: body.reject_call,
            readMessages: body.read_messages,
            ignoreGroups: body.ignore_groups,
            ignoreStatus: body.ignore_status
        });

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: 'Erro ao atualizar settings' });
    }
});

export default router;
