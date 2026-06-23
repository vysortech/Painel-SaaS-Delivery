import { Router, Request, Response } from 'express';
import axios from 'axios';
import { ConfigRepository } from '../../database/repositories/ConfigRepository';
import { GlobalSettingsRepository } from '../../database/repositories/GlobalSettingsRepository';
import { EvolutionService } from '../../external/EvolutionService';

const router = Router();

// Cache de qr code em memória para o frontend não bugar no polling
const qrCache = new Map<string, { base64: string | null, pairingCode: string | null, ts: number }>();

router.get('/qrcode/:token', async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        
        const tenant = await ConfigRepository.getByToken(token);
        
        if (!tenant) {
            return res.status(404).json({ error: 'Link inválido ou expirado' });
        }

        const settings = await GlobalSettingsRepository.get().catch(() => null);
        const EVO_URL = settings?.evolution_api_url || process.env.EVOLUTION_API_URL;
        
        if (!EVO_URL) {
            return res.status(500).json({ error: 'Evolution API não configurada.' });
        }

        const instancia = tenant.instancia;
        
        // Check Evolution Go status
        try {
            const state = await EvolutionService.getConnectionState(instancia);
            if (state === 'open') {
                await ConfigRepository.updateConnectionStatusByToken(token, 'CONNECTED');
                qrCache.delete(instancia); // Limpa o cache
                return res.json({ connected: true, status: 'CONNECTED' });
            }
        } catch(e) {
            // Ignore if not connected yet
        }

        let phone = req.query.phone as string | undefined;
        if (!phone) {
            if (tenant.telefone_whatsapp) {
                phone = tenant.telefone_whatsapp;
            } else if (tenant.telefone_admin) {
                phone = tenant.telefone_admin.split(',')[0];
            }
        }
        
        if (phone) {
            let p = phone.replace(/\D/g, '');
            if (p.length === 10 || p.length === 11) p = '55' + p;
            phone = p;
        }
        
        let base64 = null;
        let pairingCode = null;
        let statusRes = 'close';

        // Recupera do cache se tiver
        const cached = qrCache.get(instancia);
        // Removemos a expiração de 60s do cache. Se o status estiver connecting, mantemos o que temos!
        // O Pairing Code não expira em 60s, e a Evolution bloqueia a geração de novos códigos se chamado repetidas vezes.
        if (cached) {
            base64 = cached.base64;
            pairingCode = cached.pairingCode;
        }

        // Seção 3: Obter QR Code ou Pairing Code sem recriar a conexão toda hora!
        try {
            const instanceDb = await ConfigRepository.getByToken(token);
            // Verifica o status atual
            statusRes = await EvolutionService.getConnectionState(instancia);
            
            if (statusRes === 'open') {
                await ConfigRepository.updateConnectionStatusByToken(token, 'CONNECTED');
                qrCache.delete(instancia);
                return res.json({ connected: true, status: 'CONNECTED' });
            }

            // Se já está conectando e não tem req de gerar novo código, apenas pega o QR Code / Code existente
            if (statusRes === 'connecting') {
                const lastAttempt = cached?.ts || 0;
                const canRetryMissing = (Date.now() - lastAttempt) > 60000; // 60s cooldown para evitar spam

                if (req.query.forcePairing === 'true' && phone) {
                    // Forçando atualização (ex: usuário clicou no botão)
                    await EvolutionService.logoutInstance(instancia).catch(() => null);

                    const connectRes = await EvolutionService.connectInstance(instancia, phone).catch(() => null);
                    if (connectRes?.base64) base64 = connectRes.base64;
                    
                    // Se a Evolution rate-limitou o Pairing Code, mantemos o anterior que ainda é válido!
                    if (connectRes?.code) pairingCode = connectRes.code;
                    else if (cached?.pairingCode) pairingCode = cached.pairingCode;

                    qrCache.set(instancia, { base64, pairingCode, ts: Date.now() });
                } else if ((!base64 || !pairingCode) && canRetryMissing) {
                    // O cache sumiu (ex: restart do Node) ou o Pairing Code veio vazio (rate limit da Evolution).
                    // Para forçar a geração sem spammar, tentamos de novo a cada 60s.
                    await EvolutionService.logoutInstance(instancia).catch(() => null);

                    const connectRes = await EvolutionService.connectInstance(instancia, phone || undefined).catch(() => null);
                    if (connectRes?.base64) base64 = connectRes.base64;
                    
                    if (connectRes?.code) pairingCode = connectRes.code;
                    else if (cached?.pairingCode) pairingCode = cached.pairingCode; // fallback
                    
                    // Atualiza o cache e o timestamp para iniciar o cooldown de 60s
                    qrCache.set(instancia, { base64, pairingCode, ts: Date.now() });
                } else {
                    // Retorna o que estava no cache ou aguarda o cooldown
                }
            } else {
                // Não está conectando, então podemos chamar o connectInstance uma única vez para iniciar a sessão
                const connectRes = await EvolutionService.connectInstance(instancia, phone || undefined).catch(() => null);
                base64 = connectRes?.base64 || null;
                pairingCode = connectRes?.code || null;
                qrCache.set(instancia, { base64, pairingCode, ts: Date.now() });
            }
        } catch(e) {
            // fallback silencioso
        }

        res.json({ 
            connected: false, 
            status: (base64 || pairingCode) ? 'QR_READY' : 'CONNECTING',
            base64,
            pairingCode,
            instanceName: instancia,
            nome_empresa: tenant.nome_empresa,
            telefone_admin: tenant.telefone_admin,
            telefone_whatsapp: tenant.telefone_whatsapp
        });
    } catch (err: any) {
        console.error("Public Connect Error:", err.message);
        res.status(500).json({ error: 'Erro ao buscar QR Code' });
    }
});

export default router;
