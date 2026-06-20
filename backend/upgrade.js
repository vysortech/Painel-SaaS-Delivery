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
    const res = await pool.query('SELECT prompt_ia, modelo_ia_cliente, modelo_ia_admin, nome_pix FROM configuracoes LIMIT 1');
    if (res.rows.length > 0) {
      const row = res.rows[0];
      const gRes = await pool.query('SELECT id FROM saas_global_settings LIMIT 1');
      if (gRes.rowCount === 0) {
          await pool.query('INSERT INTO saas_global_settings (prompt_cliente, prompt_admin, modelo_ia_cliente, modelo_ia_admin, custo_token_entrada_cliente, custo_token_saida_cliente, custo_token_entrada_admin, custo_token_saida_admin) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', 
          [row.prompt_ia + '\n\nREGRAS DE AGENDAMENTO E CALENDARIO:\nSempre que finalizar de agendar um condominio/evento para o admin, pergunte: Deseja agendar mais algum? Se ele disser não ou pedir para gerar o calendario, DEVOLVA EXATAMENTE ESTE JSON: { "acao": "enviar_calendario", "dados": {}, "resposta_whatsapp": "Gerando seu calendario..." }' + '\n\nREGRAS DE PAGAMENTO PIX:\nSe o cliente enviar uma imagem, trate como um comprovante PIX. Extraia e valide: 1. A data deve ser a data de hoje. 2. O valor pago deve ser extamente o valor total do pedido. 3. O beneficiário do pagamento deve ser estritamente: ' + row.nome_pix + '. Se tudo bater, confirme o pedido. Se houver divergência (valor incorreto, data antiga, ou beneficiário errado), informe ao cliente o erro e recuse o pedido.' + '\n\nREGRAS DE ALTERAÇÃO DE PEDIDO: Se o cliente quiser adicionar/remover um item após já ter finalizado o pedido: 1. Calcule a diferença matemática exata do novo valor. 2. Pergunte ao cliente como ele deseja pagar ESSA DIFERENÇA (PIX ou na Retirada). 3. Se ele escolher na Retirada, altere o pedido e emita a tag [PEDIDO_ALTERADO]. 4. Se ele escolher PIX, peça a ele para fazer o PIX do valor complementar. Quando ele enviar a foto do PIX, audite a imagem. Se estiver correta, emita a tag [PEDIDO_ALTERADO]. Nunca use [PEDIDO_CONFIRMADO] para alterações, use estritamente [PEDIDO_ALTERADO]. Destaque no resumo os itens alterados e como ficou o pagamento da diferença.' || '', row.prompt_ia + '\n\nREGRAS DE AGENDAMENTO E CALENDARIO:\nSempre que finalizar de agendar um condominio/evento para o admin, pergunte: Deseja agendar mais algum? Se ele disser não ou pedir para gerar o calendario, DEVOLVA EXATAMENTE ESTE JSON: { "acao": "enviar_calendario", "dados": {}, "resposta_whatsapp": "Gerando seu calendario..." }' + '\n\nREGRAS DE PAGAMENTO PIX:\nSe o cliente enviar uma imagem, trate como um comprovante PIX. Extraia e valide: 1. A data deve ser a data de hoje. 2. O valor pago deve ser extamente o valor total do pedido. 3. O beneficiário do pagamento deve ser estritamente: ' + row.nome_pix + '. Se tudo bater, confirme o pedido. Se houver divergência (valor incorreto, data antiga, ou beneficiário errado), informe ao cliente o erro e recuse o pedido.' + '\n\nREGRAS DE ALTERAÇÃO DE PEDIDO: Se o cliente quiser adicionar/remover um item após já ter finalizado o pedido: 1. Calcule a diferença matemática exata do novo valor. 2. Pergunte ao cliente como ele deseja pagar ESSA DIFERENÇA (PIX ou na Retirada). 3. Se ele escolher na Retirada, altere o pedido e emita a tag [PEDIDO_ALTERADO]. 4. Se ele escolher PIX, peça a ele para fazer o PIX do valor complementar. Quando ele enviar a foto do PIX, audite a imagem. Se estiver correta, emita a tag [PEDIDO_ALTERADO]. Nunca use [PEDIDO_CONFIRMADO] para alterações, use estritamente [PEDIDO_ALTERADO]. Destaque no resumo os itens alterados e como ficou o pagamento da diferença.' || '', row.modelo_ia_cliente || 'google/gemma-4-31b-it', row.modelo_ia_admin || 'deepseek/deepseek-v4-flash', 0.0001, 0.0001, 0.0001, 0.0001]);
      } else {
          await pool.query('UPDATE saas_global_settings SET prompt_cliente=$1, prompt_admin=$2, modelo_ia_cliente=$3, modelo_ia_admin=$4 WHERE id=$5', 
          [row.prompt_ia + '\n\nREGRAS DE AGENDAMENTO E CALENDARIO:\nSempre que finalizar de agendar um condominio/evento para o admin, pergunte: Deseja agendar mais algum? Se ele disser não ou pedir para gerar o calendario, DEVOLVA EXATAMENTE ESTE JSON: { "acao": "enviar_calendario", "dados": {}, "resposta_whatsapp": "Gerando seu calendario..." }' + '\n\nREGRAS DE PAGAMENTO PIX:\nSe o cliente enviar uma imagem, trate como um comprovante PIX. Extraia e valide: 1. A data deve ser a data de hoje. 2. O valor pago deve ser extamente o valor total do pedido. 3. O beneficiário do pagamento deve ser estritamente: ' + row.nome_pix + '. Se tudo bater, confirme o pedido. Se houver divergência (valor incorreto, data antiga, ou beneficiário errado), informe ao cliente o erro e recuse o pedido.' + '\n\nREGRAS DE ALTERAÇÃO DE PEDIDO: Se o cliente quiser adicionar/remover um item após já ter finalizado o pedido: 1. Calcule a diferença matemática exata do novo valor. 2. Pergunte ao cliente como ele deseja pagar ESSA DIFERENÇA (PIX ou na Retirada). 3. Se ele escolher na Retirada, altere o pedido e emita a tag [PEDIDO_ALTERADO]. 4. Se ele escolher PIX, peça a ele para fazer o PIX do valor complementar. Quando ele enviar a foto do PIX, audite a imagem. Se estiver correta, emita a tag [PEDIDO_ALTERADO]. Nunca use [PEDIDO_CONFIRMADO] para alterações, use estritamente [PEDIDO_ALTERADO]. Destaque no resumo os itens alterados e como ficou o pagamento da diferença.' || '', row.prompt_ia + '\n\nREGRAS DE AGENDAMENTO E CALENDARIO:\nSempre que finalizar de agendar um condominio/evento para o admin, pergunte: Deseja agendar mais algum? Se ele disser não ou pedir para gerar o calendario, DEVOLVA EXATAMENTE ESTE JSON: { "acao": "enviar_calendario", "dados": {}, "resposta_whatsapp": "Gerando seu calendario..." }' + '\n\nREGRAS DE PAGAMENTO PIX:\nSe o cliente enviar uma imagem, trate como um comprovante PIX. Extraia e valide: 1. A data deve ser a data de hoje. 2. O valor pago deve ser extamente o valor total do pedido. 3. O beneficiário do pagamento deve ser estritamente: ' + row.nome_pix + '. Se tudo bater, confirme o pedido. Se houver divergência (valor incorreto, data antiga, ou beneficiário errado), informe ao cliente o erro e recuse o pedido.' + '\n\nREGRAS DE ALTERAÇÃO DE PEDIDO: Se o cliente quiser adicionar/remover um item após já ter finalizado o pedido: 1. Calcule a diferença matemática exata do novo valor. 2. Pergunte ao cliente como ele deseja pagar ESSA DIFERENÇA (PIX ou na Retirada). 3. Se ele escolher na Retirada, altere o pedido e emita a tag [PEDIDO_ALTERADO]. 4. Se ele escolher PIX, peça a ele para fazer o PIX do valor complementar. Quando ele enviar a foto do PIX, audite a imagem. Se estiver correta, emita a tag [PEDIDO_ALTERADO]. Nunca use [PEDIDO_CONFIRMADO] para alterações, use estritamente [PEDIDO_ALTERADO]. Destaque no resumo os itens alterados e como ficou o pagamento da diferença.' || '', row.modelo_ia_cliente || 'google/gemma-4-31b-it', row.modelo_ia_admin || 'deepseek/deepseek-v4-flash', gRes.rows[0].id]);
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
