const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgres://postgres:e2zaFkFxxIfX04QxP55LEvX2ZNW6XKFb@localhost:5432/saas_delivery' });
async function run() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'configuracoes'");
    console.log(res.rows.map(r => r.column_name));
  } catch (e) {
    console.log('ERR', e.message);
  }
  process.exit(0);
}
run();
