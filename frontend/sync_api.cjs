const axios = require('axios');

async function migrate() {
  try {
    const res = await axios.get('http://localhost:4000/api/config');
    if (res.data && res.data.length > 0) {
      const row = res.data[0];
      await axios.put('http://localhost:4000/api/settings', {
        prompt_cliente: row.prompt_ia || '',
        prompt_admin: row.prompt_ia || '',
        modelo_ia_cliente: row.modelo_ia_cliente || 'google/gemma-4-31b-it',
        modelo_ia_admin: row.modelo_ia_admin || 'deepseek/deepseek-v4-flash',
        custo_token_entrada_cliente: 0.0001,
        custo_token_saida_cliente: 0.0001,
        custo_token_entrada_admin: 0.0001,
        custo_token_saida_admin: 0.0001
      });
      console.log('Dados globais sincronizados via API!');
    } else {
      console.log('Nenhum dado antigo encontrado.');
    }
  } catch(e) {
    console.error(e.message);
  }
}
migrate();
