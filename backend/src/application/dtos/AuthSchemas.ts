import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(3, 'Username muito curto').max(50),
    password: z.string().min(4, 'Senha muito curta').max(100),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    nome: z.string().min(3, 'Nome muito curto').max(100),
    username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Apenas letras, números e underscore permitidos no username'),
    password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres').max(100),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID deve ser numérico'),
  }),
  body: z.object({
    nome: z.string().min(3).max(100).optional(),
    username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/).optional(),
    password: z.string().min(6).max(100).optional(),
  }),
});
