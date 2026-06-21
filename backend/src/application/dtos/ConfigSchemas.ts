import { z } from 'zod';

const tenantBodySchema = z.object({
  instancia: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'A instância não deve conter espaços ou caracteres especiais').optional(),
  nome_empresa: z.string().optional(),
  telefone_admin: z.string().optional().nullable(),
  email_admin: z.string().optional().nullable().or(z.literal('')),
  tipo_assinatura: z.string().optional().nullable(),
  status_assinatura: z.string().optional().nullable(),
  plano_tipo: z.string().optional().nullable(),
  dias_carencia: z.number().optional().nullable(),
  contexto_loja: z.string().optional().nullable(),
  nome_atendente: z.string().optional().nullable(),
  botoes_tempo: z.string().optional().nullable(),
  telefone_whatsapp: z.string().optional().nullable(),
  valor_assinatura: z.number().optional().nullable(),
  data_vencimento: z.string().optional().nullable(),
  status_pagamento: z.string().optional().nullable(),
  chave_pix: z.string().optional().nullable(),
  nome_pix: z.string().optional().nullable(),
  sempre_online: z.boolean().optional(),
  rejeitar_chamadas: z.boolean().optional(),
  marcar_lidas: z.boolean().optional(),
  ignorar_grupos: z.boolean().optional(),
  ignorar_status: z.boolean().optional(),
  ler_status: z.boolean().optional(),
  aprovado: z.boolean().optional(),
}).passthrough(); // Allow extra fields without stripping or crashing

export const createTenantSchema = z.object({
  body: tenantBodySchema,
});

export const updateTenantSchema = z.object({
  params: z.object({
    instancia: z.string(),
  }),
  body: tenantBodySchema,
});
