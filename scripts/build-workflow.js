const fs = require('fs');
const path = require('path');

const codePath = path.join(__dirname, '../n8n/bhd-parser-code-node.js');
const code = fs.readFileSync(codePath, 'utf8');

const workflow = {
  name: "Banco BHD - Flujo Automático Cada 1 Hora & Histórico",
  nodes: [
    {
      parameters: {
        rule: {
          interval: [
            {
              field: "hours",
              hoursInterval: 1
            }
          ]
        }
      },
      name: "⏰ Trigger Cada 1 Hora",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [180, 200],
      id: "sched_1"
    },
    {
      parameters: {
        operation: "getAll",
        limit: 100,
        filters: {
          q: '(from:Alertas@bhd.com.do OR from:bhd.com.do) is:unread'
        }
      },
      name: "1. Buscar Nuevos No Leídos (is:unread)",
      type: "n8n-nodes-base.gmail",
      typeVersion: 2.1,
      position: [420, 200],
      id: "gmail_unread",
      credentials: {
        gmailOAuth2: {
          id: "gmail_oauth_creds",
          name: "Gmail account"
        }
      }
    },
    {
      parameters: {
        operation: "getAll",
        limit: 500,
        filters: {
          q: '(from:Alertas@bhd.com.do OR from:bhd.com.do)'
        }
      },
      name: "📥 [Manual] Poblar Todo el Histórico",
      type: "n8n-nodes-base.gmail",
      typeVersion: 2.1,
      position: [420, 440],
      id: "gmail_all",
      credentials: {
        gmailOAuth2: {
          id: "gmail_oauth_creds",
          name: "Gmail account"
        }
      }
    },
    {
      parameters: {
        operation: "get",
        messageId: "={{ $json.id }}",
        format: "resolved"
      },
      name: "2. Descargar Detalle Completo (HTML)",
      type: "n8n-nodes-base.gmail",
      typeVersion: 2.1,
      position: [660, 320],
      id: "gmail_get",
      credentials: {
        gmailOAuth2: {
          id: "gmail_oauth_creds",
          name: "Gmail account"
        }
      }
    },
    {
      parameters: {
        jsCode: code
      },
      name: "3. Code Node (Parser BHD)",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [880, 320],
      id: "code_parser"
    },
    {
      parameters: {
        method: "POST",
        url: "http://api:3000/api/v1/transactions",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: "x-api-key",
              value: "legacy_n8n_flow_no_longer_supported"
            },
            {
              name: "Content-Type",
              value: "application/json"
            }
          ]
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json) }}",
        options: {}
      },
      name: "4. HTTP Request (Guardar en BD)",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1100, 320],
      id: "http_ingest"
    },
    {
      parameters: {
        operation: "markAsRead",
        messageId: "={{ $json.externalId }}"
      },
      name: "5. Marcar Correo como Leído",
      type: "n8n-nodes-base.gmail",
      typeVersion: 2.1,
      position: [1320, 320],
      id: "gmail_mark_read",
      credentials: {
        gmailOAuth2: {
          id: "gmail_oauth_creds",
          name: "Gmail account"
        }
      }
    }
  ],
  connections: {
    "⏰ Trigger Cada 1 Hora": {
      main: [
        [
          {
            node: "1. Buscar Nuevos No Leídos (is:unread)",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "1. Buscar Nuevos No Leídos (is:unread)": {
      main: [
        [
          {
            node: "2. Descargar Detalle Completo (HTML)",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "📥 [Manual] Poblar Todo el Histórico": {
      main: [
        [
          {
            node: "2. Descargar Detalle Completo (HTML)",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "2. Descargar Detalle Completo (HTML)": {
      main: [
        [
          {
            node: "3. Code Node (Parser BHD)",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "3. Code Node (Parser BHD)": {
      main: [
        [
          {
            node: "4. HTTP Request (Guardar en BD)",
            type: "main",
            index: 0
          }
        ]
      ]
    },
    "4. HTTP Request (Guardar en BD)": {
      main: [
        [
          {
            node: "5. Marcar Correo como Leído",
            type: "main",
            index: 0
          }
        ]
      ]
    }
  },
  active: false,
  settings: {
    executionOrder: "v1"
  }
};

const targetPath = path.join(__dirname, '../n8n/bhd-transaction-workflow.json');
fs.writeFileSync(targetPath, JSON.stringify(workflow, null, 2), 'utf8');
console.log('✅ Workflow JSON successfully created at:', targetPath);
