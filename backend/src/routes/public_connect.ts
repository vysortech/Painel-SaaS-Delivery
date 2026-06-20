import { Router } from 'express';
import axios from 'axios';
import pool from '../db';

const router = Router();

const EVO_URL = process.env.EVOLUTION_API_URL || 'http://116.203.152.114:8080';

router.get('/qrcode/:token', async (req, res) => {
    const { token } = req.params;
    try {
        // Busca a instância pelo token
        const dbRes = await pool.query('SELECT instancia, telefone_admin, status_conexao FROM configuracoes WHERE connect_token = $1', [token]);
        
        if (dbRes.rows.length === 0) {
            return res.status(404).json({ error: 'Link inválido ou expirado' });
        }

        const instancia = dbRes.rows[0].instancia;
        // const phone = dbRes.rows[0].telefone_admin; // Se o telefone fosse puxado do admin, mas o ideal é que seja passado ou configurado na instância.
        
        // Vamos checar na Evolution Go se a instância já está conectada
        try {
            const stateRes = await axios.get(`${EVO_URL}/instance/connectionState/${instancia}`, {
                headers: { 'apikey': instancia }
            });
            const state = stateRes.data?.instance?.state || stateRes.data?.state;
            
            if (state === 'open') {
                // Atualiza banco
                await pool.query('UPDATE configuracoes SET status_conexao = $1 WHERE instancia = $2', ['CONNECTED', instancia]);
                return res.json({ connected: true, status: 'CONNECTED' });
            }
        } catch(e) {
            // Pode dar erro se não estiver conectada
        }

        // Se não estiver conectada, busca o QR Code
        // (Isso assume que o webhook já foi setado quando a instância foi criada)
        const qrRes = await axios.get(`${EVO_URL}/instance/qr?instance=${instancia}`, {
            headers: { 'apikey': instancia }
        });

        let finalData = qrRes.data;
        if (!finalData.base64) {
            const qr = finalData.qrcode || finalData.Qrcode || finalData.data?.qrcode || finalData.data?.Qrcode || finalData.data?.base64;
            if (qr) finalData.base64 = qr;
        }

        res.json({ connected: false, ...finalData, instanceName: instancia });
    } catch (err: any) {
        console.error("Public Connect Error:", err.message);
        res.status(500).json({ error: 'Erro ao buscar QR Code' });
    }
});

export default router;
