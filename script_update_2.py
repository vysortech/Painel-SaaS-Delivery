import json
import os

filepath = 'd:/N8N/n8n_fluxo_pronto.json'
with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

for node in data.get('nodes', []):
    if node.get('type') == 'n8n-nodes-base.httpRequest':
        url = node['parameters'].get('url', '')
        if 'vysortech.app.br' in url:
            node['parameters']['url'] = url.replace('https://go.vysortech.app.br', "={{ $('Merge Config').first().json.config.evolution_api_url }}")

with open(filepath, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
