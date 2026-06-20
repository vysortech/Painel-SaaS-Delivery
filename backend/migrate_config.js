const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgres://postgres:e2zaFkFxxIfX04QxP55LEvX2ZNW6XKFb@localhost:5432/saas_delivery' });
async function run() {
  try {
    await pool.query(`
      ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS plano_tipo VARCHAR(50) DEFAULT 'recorrente';
      ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS contexto_loja TEXT DEFAULT '';
      ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS dias_carencia INT DEFAULT 0;
    `);
    console.log('Migrated configuracoes successfully!');
  } catch (e) {
    console.log('Migration error:', e.message);
  }
  process.exit(0);
}
run();
