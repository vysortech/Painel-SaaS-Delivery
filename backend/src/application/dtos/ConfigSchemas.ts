import { z } from 'zod';

const tenantBodySchema = z.object({
  instancia: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'A instância não deve conter espaços ou caracteres especiais'),
  nome_empresa: z.string().min(2).max(100),
  telefone_admin: z.string().max(20).optional().nullable(),
  email_admin: z.string().email('Email inválido').optional().nullable(),
  tipo_assinatura: z.string().max(50).optional().nullable(),
  valor_assinatura: z.number().min(0).optional().nullable(),
  data_vencimento: z.string().datetime({ offset: true }).optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).or(z.date()),
  status_pagamento: z.string().max(20).optional().nullable(),
  chave_pix: z.string().max(100).optional().nullable(),
  sempre_online: z.boolean().optional(),
  rejeitar_chamadas: z.boolean().optional(),
  ler_status: z.boolean().optional(),
  aprovado: z.boolean().optional(),
});

export const createTenantSchema = z.object({
  body: tenantBodySchema,
});

export const updateTenantSchema = z.object({
  params: z.object({
    instancia: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  }),
  body: tenantBodySchema.partial(), // All fields become optional for updates
});
