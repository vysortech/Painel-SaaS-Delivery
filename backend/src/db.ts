import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'saas_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'e2zaFkFxxIfX04QxP55LEvX2ZNW6XKFb',
});

// Test connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erro ao conectar no PostgreSQL:', err.stack);
  } else {
    console.log('✅ Conectado ao PostgreSQL com sucesso!');
    release();
  }
});

export default pool;
