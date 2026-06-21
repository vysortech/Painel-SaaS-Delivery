# Parâmetros Avançados de Integração: Evolution CRM x Evolution Go

Este documento foi expandido para cobrir **todos os detalhes técnicos, headers de segurança, estados de conexão, configurações avançadas e tratamento de erros** necessários para uma integração robusta do Evolution CRM com a API do Evolution Go (WhatsApp).

---

## 0. Autenticação Base (Global)
Todas as requisições feitas do seu CRM para a API do Evolution Go devem obrigatoriamente incluir o Header de Autenticação Global.

**Header Obrigatório:**
```http
apikey: SUAKEYGLOBALDAEVOLUTION
Content-Type: application/json
```

---

## 1. Criar Instância (Create Instance)
**Endpoint:** `POST /instance/create`

Responsável por criar a sessão no banco de dados do Evolution Go.

### Payload Detalhado
```json
{
  "instanceName": "WhatsApp Evolution Go",
  "token": "token_opcional_seguranca",
  "qrcode": true,
  "b64": true,
  "integration": "WHATSAPP-BAILEYS",
  "webhook": "https://seu-crm.com/webhooks/evolution",
  "webhook_by_events": false,
  "webhook_base64": false,
  "events": [
    "MESSAGES_UPSERT",
    "CONNECTION_UPDATE",
    "SEND_MESSAGE",
    "PRESENCE_UPDATE",
    "MESSAGES_UPDATE"
  ]
}
```

---

## 2. Configurações da Instância (Instance Settings)
**Endpoint:** `POST /settings/set/:instanceName`

### Payload Detalhado (Mapeamento da UI)
```json
{
  "rejectCall": true,
  "msgCall": "Neste canal não aceitamos ligações. Por favor, envie uma mensagem de texto.",
  "ignoreGroups": false,
  "alwaysOnline": false,
  "readMessages": false,
  "readStatus": false,
  "syncFullHistory": false
}
```

---

## 3. Conectar / Gerar QR Code ou Pairing Code
**Endpoint:** `GET /instance/connect/:instanceName`

### 3.1 Via Pairing Code
`GET /instance/connect/WhatsApp_Evolution_Go?number=5511999999999`

Resposta:
```json
{
  "instance": "WhatsApp_Evolution_Go",
  "code": "XYZ1-ABC2"
}
```

### 3.2 Via QR Code
`GET /instance/connect/WhatsApp_Evolution_Go`

Resposta:
```json
{
  "instance": "WhatsApp_Evolution_Go",
  "base64": "data:image/png;base64,iVBORw0KGgo...",
  "count": 1
}
```

---

## 4. Consulta do Estado da Conexão (Polling)
**Endpoint:** `GET /instance/connectionState/:instanceName`

Respostas: `"open"`, `"connecting"`, `"close"`

---

## 5. Webhooks (connection.update)

### 5.1 Conectou: `state: "open"`, `statusReason: 200`
### 5.2 Desconectou: `state: "close"`, `statusReason: 401|403|408`

---

## 6. Manutenção

- **Logout:** `DELETE /instance/logout/:instanceName`
- **Deletar:** `DELETE /instance/delete/:instanceName`
- **Restart:** `PUT /instance/restart/:instanceName`

---

## 7. Códigos de Erro

- `200/201` OK
- `401` apikey ausente/incorreto
- `403` instância já conectada
- `404` instância inexistente
- `500` erro interno
