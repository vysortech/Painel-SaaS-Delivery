import { z } from 'zod';

export const webhookAlertSchema = z.object({
  body: z.object({
    instancia: z.string().min(1, 'A instância é obrigatória').max(50),
    n8n_execution_id: z.string().max(100).optional(),
    node_name: z.string().max(100).optional(),
    error_message: z.string(), // We don't limit too strictly here as errors can be long, but it prevents objects being sent as errors.
  }),
});
