const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'saas_delivery',
  user: 'postgres',
  password: 'e2zaFkFxxIfX04QxP55LEvX2ZNW6XKFb'
});
pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'", (err, res) => {
  if (err) console.error(err);
  else console.log(res.rows);
  pool.end();
});
