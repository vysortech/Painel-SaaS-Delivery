const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgres://postgres:e2zaFkFxxIfX04QxP55LEvX2ZNW6XKFb@localhost:5432/saas_delivery' });
async function run() {
  try {
    await pool.query(`UPDATE configuracoes SET valor_assinatura = 1 WHERE instancia = 'foobar'`);
    console.log('OK');
  } catch (e) {
    console.log(e.message);
  }
  process.exit(0);
}
run();
