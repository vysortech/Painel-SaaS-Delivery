import { z } from 'zod';

const tenantBodySchema = z.object({
  instancia: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'A instância não deve conter espaços ou caracteres especiais').optional(),
  nome_empresa: z.any().optional(),
  telefone_admin: z.any().optional(),
  email_admin: z.any().optional(),
  tipo_assinatura: z.any().optional(),
  status_assinatura: z.any().optional(),
  plano_tipo: z.any().optional(),
  dias_carencia: z.any().optional(),
  contexto_loja: z.any().optional(),
  nome_atendente: z.any().optional(),
  botoes_tempo: z.any().optional(),
  telefone_whatsapp: z.any().optional(),
  valor_assinatura: z.any().optional(),
  data_vencimento: z.any().optional(),
  status_pagamento: z.any().optional(),
  chave_pix: z.any().optional(),
  nome_pix: z.any().optional(),
  sempre_online: z.any().optional(),
  rejeitar_chamadas: z.any().optional(),
  marcar_lidas: z.any().optional(),
  ignorar_grupos: z.any().optional(),
  ignorar_status: z.any().optional(),
  ler_status: z.any().optional(),
  aprovado: z.any().optional(),
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
