import { z } from 'zod';

export const updateSettingsSchema = z.object({
  body: z.object({
    id: z.number().optional(), // In case it's passed, it should be a number
    n8n_url: z.string().url('URL do n8n inválida').optional(),
    n8n_token: z.string().max(255).optional(),
    openai_key: z.string().max(255).optional(),
    evolution_url: z.string().url('URL da Evolution inválida').optional(),
    evolution_global_key: z.string().max(255).optional(),
    prompt_cliente: z.string().optional(),
    prompt_vendedor: z.string().optional(),
    prompt_agendamento: z.string().optional(),
    custo_token_entrada: z.number().min(0).optional().nullable(),
    custo_token_saida: z.number().min(0).optional().nullable(),
    limite_tokens_diario: z.number().int().min(0).optional().nullable(),
  }),
});
