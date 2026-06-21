import { Pool } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../../shared/logger';

dotenv.config();

if (!process.env.DB_PASSWORD) {
    logger.fatal('FATAL: DB_PASSWORD não definido nas variáveis de ambiente!');
    process.exit(1);
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'saas_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
});

pool.on('error', (err, client) => {
  logger.error({ err }, 'Unexpected error on idle client');
  // Evitamos chamar process.exit() aqui para que falhas de rede intermitentes não derrubem o servidor
});

// Test connection
pool.connect((err, client, release) => {
  if (err) {
    logger.error({ err }, 'Erro ao conectar no PostgreSQL');
  } else {
    logger.info('Conectado ao PostgreSQL com sucesso!');
    release();
  }
});

export default pool;
