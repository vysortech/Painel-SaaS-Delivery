import cron from 'node-cron';
import pool from '../db';
import axios from 'axios';

const EVO_URL = process.env.EVOLUTION_API_URL || 'http://116.203.152.114:8080';
const EVO_KEY = process.env.EVOLUTION_API_KEY || 'X8G9W2M4V5N7B3L1K6J0H9P2Y3T5C8F1';

export function startBillingCron() {
    // Roda todo dia às 08:00 da manhã
    cron.schedule('0 8 * * *', async () => {
        console.log('[CRON] Verificando vencimentos de mensalidades...');
        try {
            // Busca tenants onde a validade é hoje, amanhã ou em 3 dias.
            // Para simplificar no SQL do Postgres:
            const result = await pool.query(`
                SELECT id, name, phone, validade, instancia,
                EXTRACT(DAY FROM validade - CURRENT_DATE) as days_left
                FROM tenants
                WHERE validade IS NOT NULL
                AND phone IS NOT NULL
                AND instancia IS NOT NULL
                AND EXTRACT(DAY FROM validade - CURRENT_DATE) IN (0, 1, 3)
            `);

            const tenants = result.rows;

            for (const tenant of tenants) {
                let message = '';
                const { name, phone, instancia, days_left } = tenant;
                const formattedPhone = phone.replace(/\D/g, ''); // Garante só números

                if (days_left === 3) {
                    message = `Olá *${name}*! 👋\n\nEste é um lembrete de que a mensalidade do seu Painel SaaS Delivery vencerá em *3 dias*.\n\nEvite a suspensão automática dos serviços. Para renovar, entre em contato com o suporte ou realize o pagamento.`;
                } else if (days_left === 1) {
                    message = `⚠️ *Aviso Importante!*\n\nOlá *${name}*, a mensalidade do seu Painel SaaS Delivery vence *Amanhã*.\n\nEfetue o pagamento para evitar o bloqueio dos serviços do seu sistema e delivery.`;
                } else if (days_left === 0) {
                    message = `🚨 *Vencimento Hoje!*\n\nOlá *${name}*, a mensalidade do seu Painel SaaS Delivery vence *HOJE*.\n\nPara garantir a continuidade das suas vendas e acesso ao sistema, realize o pagamento do seu plano o quanto antes.`;
                }

                if (message) {
                    try {
                        await axios.post(`${EVO_URL}/message/sendText/${instancia}`, {
                            number: `55${formattedPhone}`,
                            options: {
                                delay: 1200,
                                presence: "composing"
                            },
                            textMessage: {
                                text: message
                            }
                        }, {
                            headers: {
                                'apikey': EVO_KEY,
                                'Content-Type': 'application/json'
                            }
                        });
                        console.log(`[CRON] Mensagem de cobrança enviada para ${name} (${phone}) pela instância ${instancia}`);
                    } catch (err: any) {
                        console.error(`[CRON] Falha ao enviar cobrança para ${name}:`, err.response?.data || err.message);
                    }
                }
            }
            console.log(`[CRON] Verificação de vencimentos concluída. Processados: ${tenants.length} empresas.`);
        } catch (error) {
            console.error('[CRON] Erro ao buscar tenants para cobrança:', error);
        }
    });

    console.log('[CRON] Serviço de cobrança diária ativado (08:00 AM).');
}
