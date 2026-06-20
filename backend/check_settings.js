require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'saas_delivery',
  user: 'postgres',
  password: '123456',
});

pool.query('SELECT * FROM saas_global_settings LIMIT 1')
  .then(res => {
    console.log(res.rows[0]);
    process.exit(0);
  })
  .catch(e => {
    console.error(e.message);
    process.exit(1);
  });
