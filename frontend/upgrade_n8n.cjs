const fs = require('fs');
const path = require('path');

const filePath = 'D:\\N8N\\n8n_fluxo_pronto.json';

try {
  let raw = fs.readFileSync(filePath, 'utf8');
  let data = JSON.parse(raw);

  let nodeCount = data.nodes.length;
  
  // Modificar Load Config SaaS
  for (let node of data.nodes) {
    if (node.name === 'Load Config SaaS') {
      node.parameters.query = "SELECT c.*, g.prompt_mestre_cliente, g.prompt_mestre_admin, g.modelo_ia_cliente as modelo_global_cliente, g.modelo_ia_admin as modelo_global_admin FROM configuracoes c CROSS JOIN (SELECT * FROM saas_config_global LIMIT 1) g WHERE c.instancia = '{{ $json.instance }}';";
    }
  }

  // Verificar se o nó "Assinatura Ativa?" já existe
  const hasAntiCalote = data.nodes.some(n => n.name === 'Assinatura Ativa?');

  if (!hasAntiCalote) {
     // Criar o nó IF do Anti Calote
     const ifNode = {
        "parameters": {
          "conditions": {
            "string": [
              {
                "value1": "={{ $('Merge Config').first().json.config.status_assinatura }}",
                "value2": "ativo"
              }
            ]
          }
        },
        "id": "anticalote-1234-5678",
        "name": "Assinatura Ativa?",
        "type": "n8n-nodes-base.if",
        "typeVersion": 1,
        "position": [-7344, 1500] // Posicionado próximo ao IF atual
     };

     // Criar nó de Aviso
     const avisoNode = {
        "parameters": {
          "method": "POST",
          "url": "https://go.vysortech.app.br/send/text",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              {
                "name": "apikey",
                "value": "X8G9W2M4V5N7B3L1K6J0H9P2Y3T5C8F1"
              }
            ]
          },
          "sendBody": true,
          "specifyBody": "json",
          "jsonBody": "={\\n  \"number\": \"{{ $('Merge Config').first().json.config.telefone_admin.split(',')[0] }}\",\\n  \"text\": \"⚠️ *[Sistema SaaS]* O robô de autoatendimento foi paralisado por pendência ou bloqueio na assinatura.\\n\\nAcesse o painel para regularizar.\"} ",
          "options": {}
        },
        "id": "aviso-bloqueio-1234",
        "name": "Aviso Bloqueio Admin",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4,
        "position": [-7144, 1300]
     };

     data.nodes.push(ifNode);
     data.nodes.push(avisoNode);
  }

  // Modificar Nova Inteligencia Artificial (Prompt Dinamico e Modelo Global)
  for (let node of data.nodes) {
    if (node.name === 'Nova Inteligência Artificial') {
      let body = node.parameters.jsonBody;
      
      // Mudar modelo
      body = body.replace('config.modelo_ia', 'config.modelo_global_cliente');
      
      // Injetar o prompt dinâmico
      // Como o body atual é uma string JSON complexa, vamos simplificar a substituição.
      // O System message tem content: `Você é a ...`
      // Vamos substituir todo o content do system message pelo prompt dinâmico.
      // É mais seguro reescrever o nó inteiro se a estrutura não for fácil de substituir.
      
      node.parameters.jsonBody = "={{ JSON.stringify({\n  \"model\": $('Merge Config').first().json.config.modelo_global_cliente || 'google/gemma-4-31b-it',\n  \"messages\": [\n    {\n      \"role\": \"system\",\n      \"content\": $('Merge Config').first().json.config.prompt_mestre_cliente + \"\\\\n\\\\n=== CONTEXTO DA LOJA ===\\\\n\" + ($('Merge Config').first().json.config.contexto_loja || '') + \"\\\\n\\\\n=== INFORMAÇÕES DE HOJE ===\\\\nLocal: \" + $json.local_atual + \"\\\\nPermite Retirada Externa: \" + ($json.retirada_externa ? \"Sim\" : \"Não\")\n    },\n    {\n      \"role\": \"user\",\n      \"content\": \"Nome salvo no sistema: \" + $json.nomeCliente + \"\\\\n\\\\nMensagem do Cliente: \" + $json.mensagemCliente\n    }\n  ]\n}) }}";
    }
    
    // Modificar Extrair Tempo
    if (node.name === 'Extrair Tempo') {
       node.parameters.jsCode = "const msg = $json.conteudo || \\"\\";\\nconst config = $('Merge Config').first()?.json?.config || {};\\nconst botoes = config.botoes_tempo ? config.botoes_tempo.split(',').map(t => t.trim()) : ['10', '20', '30'];\\n\\nlet tempo = parseInt(botoes[0]) || 20;\\nfor(let btn of botoes) {\\n  if(msg.includes(btn)) {\\n    tempo = parseInt(btn);\\n    break;\\n  }\\n}\\nif(!botoes.some(b => msg.includes(b))) {\\n   tempo = parseInt(msg.match(/\\\\d+/)?.[0]) || tempo;\\n}\\nreturn [{ json: { tempo: tempo, instancia: config.instancia } }];";
    }

    // Modificar Agente Admin AI (Memória)
    if (node.name === 'Agente Admin AI (Memória)') {
       let body = node.parameters.jsonBody;
       body = body.replace('config.modelo_ia', 'config.modelo_global_admin');
       node.parameters.jsonBody = body;
    }

    // Modificar Preparar Contexto AI
    if (node.name === 'Preparar Contexto AI') {
       let code = node.parameters.jsCode;
       code = code.replace('config?.prompt_ia', 'config?.prompt_mestre_admin');
       node.parameters.jsCode = code;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log('n8n Fluxo Atualizado com Sucesso para V3!');

} catch(err) {
  console.error(err);
}
