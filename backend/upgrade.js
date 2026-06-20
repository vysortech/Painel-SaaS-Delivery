const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'saas_delivery',
  user: 'postgres',
  password: 'e2zaFkFxxIfX04QxP55LEvX2ZNW6XKFb',
});

async function upgrade() {
  try {
    const res = await pool.query('SELECT prompt_ia, modelo_ia_cliente, modelo_ia_admin FROM configuracoes LIMIT 1');
    if (res.rows.length > 0) {
      const row = res.rows[0];
      const gRes = await pool.query('SELECT id FROM saas_global_settings LIMIT 1');
      if (gRes.rowCount === 0) {
          await pool.query('INSERT INTO saas_global_settings (prompt_cliente, prompt_admin, modelo_ia_cliente, modelo_ia_admin, custo_token_entrada_cliente, custo_token_saida_cliente, custo_token_entrada_admin, custo_token_saida_admin) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', 
          [row.prompt_ia || '', row.prompt_ia || '', row.modelo_ia_cliente || 'google/gemma-4-31b-it', row.modelo_ia_admin || 'deepseek/deepseek-v4-flash', 0.0001, 0.0001, 0.0001, 0.0001]);
      } else {
          await pool.query('UPDATE saas_global_settings SET prompt_cliente=$1, prompt_admin=$2, modelo_ia_cliente=$3, modelo_ia_admin=$4 WHERE id=$5', 
          [row.prompt_ia || '', row.prompt_ia || '', row.modelo_ia_cliente || 'google/gemma-4-31b-it', row.modelo_ia_admin || 'deepseek/deepseek-v4-flash', gRes.rows[0].id]);
      }
      console.log('✅ Migracao DB Sucesso');
    }

    const filePath = 'D:\\\\N8N\\\\n8n_fluxo_pronto.json';
    let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    for (let node of data.nodes) {
      if (node.name === 'Load Config SaaS') {
        node.parameters.query = "SELECT c.*, g.prompt_cliente, g.prompt_admin, g.modelo_ia_cliente as modelo_global_cliente, g.modelo_ia_admin as modelo_global_admin FROM configuracoes c CROSS JOIN (SELECT * FROM saas_global_settings LIMIT 1) g WHERE c.instancia = '{{ $json.instance }}';";
      }
    }

    if (!data.nodes.some(n => n.name === 'Assinatura Ativa?')) {
       data.nodes.push({
          "parameters": {
            "conditions": { "string": [ { "value1": "={{ $('Merge Config').first().json.config.status_assinatura }}", "value2": "ativo" } ] }
          },
          "id": "anticalote-1234", "name": "Assinatura Ativa?", "type": "n8n-nodes-base.if", "typeVersion": 1, "position": [-7344, 1500]
       });

       data.nodes.push({
          "parameters": {
            "method": "POST", "url": "https://go.vysortech.app.br/send/text", "sendHeaders": true,
            "headerParameters": { "parameters": [ { "name": "apikey", "value": "X8G9W2M4V5N7B3L1K6J0H9P2Y3T5C8F1" } ] },
            "sendBody": true, "specifyBody": "json",
            "jsonBody": "={\n  \"number\": \"{{ $('Merge Config').first().json.config.telefone_admin.split(',')[0] }}\",\n  \"text\": \"⚠️ [Sistema SaaS] Autoatendimento bloqueado por pendência financeira. Regularize no painel.\"\n}",
            "options": {}
          },
          "id": "aviso-bloqueio-1234", "name": "Aviso Bloqueio Admin", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4, "position": [-7144, 1300]
       });
    }

    for (let node of data.nodes) {
      if (node.name === 'Nova Inteligência Artificial') {
        node.parameters.jsonBody = "={{ JSON.stringify({\n  \"model\": $('Merge Config').first().json.config.modelo_global_cliente || 'google/gemma-4-31b-it',\n  \"messages\": [\n    {\n      \"role\": \"system\",\n      \"content\": $('Merge Config').first().json.config.prompt_cliente + \"\\n\\n=== CONTEXTO DA LOJA ===\\n\" + ($('Merge Config').first().json.config.contexto_loja || '') + \"\\n\\n=== INFORMAÇÕES DE HOJE ===\\nLocal: \" + $json.local_atual + \"\\nPermite Retirada Externa: \" + ($json.retirada_externa ? \"Sim\" : \"Não\")\n    },\n    {\n      \"role\": \"user\",\n      \"content\": \"Nome salvo no sistema: \" + $json.nomeCliente + \"\\n\\nMensagem do Cliente: \" + $json.mensagemCliente\n    }\n  ]\n}) }}";
      }
      
      if (node.name === 'Extrair Tempo') {
         node.parameters.jsCode = "const msg = $json.conteudo || \"\";\nconst config = $('Merge Config').first()?.json?.config || {};\nconst botoes = config.botoes_tempo ? config.botoes_tempo.split(',').map(t => t.trim()) : ['10', '20', '30'];\n\nlet tempo = parseInt(botoes[0]) || 20;\nfor(let btn of botoes) {\n  if(msg.includes(btn)) {\n    tempo = parseInt(btn);\n    break;\n  }\n}\nif(!botoes.some(b => msg.includes(b))) {\n   tempo = parseInt(msg.match(/\\d+/)?.[0]) || tempo;\n}\nreturn [{ json: { tempo: tempo, instancia: config.instancia } }];";
      }

      if (node.name === 'Agente Admin AI (Memória)') {
         let body = node.parameters.jsonBody;
         if (body) {
             node.parameters.jsonBody = body.replace('config.modelo_ia', 'config.modelo_global_admin');
         }
      }

      if (node.name === 'Preparar Contexto AI') {
         let code = node.parameters.jsCode;
         if (code) {
             node.parameters.jsCode = code.replace('config?.prompt_ia', 'config?.prompt_admin');
         }
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log('✅ n8n Atualizado');
    pool.end();
  } catch(e) { console.error(e); pool.end(); }
}
upgrade();
