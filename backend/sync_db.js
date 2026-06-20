const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'saas_delivery',
  password: 'e2zaFkFxxIfX04QxP55LEvX2ZNW6XKFb',
  port: 5432,
});

async function migrate() {
  try {
    const res = await pool.query('SELECT prompt_ia, modelo_ia_cliente, modelo_ia_admin FROM configuracoes LIMIT 1');
    if (res.rows.length > 0) {
      const row = res.rows[0];
      await pool.query(`
        INSERT INTO saas_config_global 
        (prompt_mestre_cliente, prompt_mestre_admin, modelo_ia_cliente, modelo_ia_admin) 
        VALUES ($1, $2, $3, $4)
      `, [row.prompt_ia || '', row.prompt_ia || '', row.modelo_ia_cliente || 'google/gemma-4-31b-it', row.modelo_ia_admin || 'deepseek/deepseek-v4-flash']);
      
      console.log('Dados globais (Prompts e Modelos) sincronizados com sucesso!');
    } else {
      console.log('Nenhuma configuração antiga encontrada.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

migrate();
