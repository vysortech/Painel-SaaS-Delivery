import json
import os

filepath = 'd:/N8N/n8n_roteador.json'
with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

for node in data.get('nodes', []):
    if node.get('type') == 'n8n-nodes-base.postgres':
        query = node['parameters'].get('query', '')
        if 'FROM saas_global_settings' in query and 'g.evolution_api_url' not in query:
            node['parameters']['query'] = query.replace('g.modelo_ia_admin as modelo_global_admin', 'g.modelo_ia_admin as modelo_global_admin, g.evolution_api_url, g.evolution_api_key')

    if node.get('type') == 'n8n-nodes-base.httpRequest':
        url = node['parameters'].get('url', '')
        if 'vysortech.app.br' in url:
            node['parameters']['url'] = url.replace('https://go.vysortech.app.br', "={{ $('Merge Config').first().json.config.evolution_api_url }}")
            if 'send/text' in node['parameters']['url']:
                node['parameters']['url'] = "={{ $('Merge Config').first().json.config.evolution_api_url }}/message/sendText/{{ $('Merge Config').first().json.config.instancia }}"
        
        headers = node['parameters'].get('headerParameters', {}).get('parameters', [])
        for header in headers:
            if header.get('name', '').lower() == 'apikey' and header.get('value') == 'X8G9W2M4V5N7B3L1K6J0H9P2Y3T5C8F1':
                header['value'] = "={{ $('Merge Config').first().json.config.evolution_api_key }}"

with open(filepath, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
