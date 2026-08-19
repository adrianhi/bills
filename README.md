# 💳 Banco BHD Transaction Tracker & Expense Management API

Un sistema integral y automatizado para capturar, procesar, normalizar, categorizar y analizar notificaciones de transacciones por correo electrónico de **Banco BHD (República Dominicana)** mediante un flujo de **n8n**, una **API REST en TypeScript/Node.js**, persistencia con **Prisma ORM**, soporte para exportación a **Excel/CSV/JSON** y un **Dashboard Web interactivo**.

---

## 🏛️ Arquitectura del Sistema

```
[ Gmail Inbox ]
       │ (Polling / Event Trigger cada X min)
       ▼
[ n8n Workflow ]
  ├─ 1. Gmail Trigger (Query: from:bhd.com.do "Notificación de Transacciones" is:unread)
  ├─ 2. Code Node (Parser HTML/Regex + Normalización de fechas/moneda)
  └─ 3. HTTP Request Node (POST /api/v1/transactions con x-api-key)
       │
       ▼
[ Tu Backend / API (Express + TypeScript) ]
  ├─ Autenticación (Header x-api-key / Bearer Token)
  ├─ Validación de Payload (Zod Schema Validation)
  ├─ Normalizador de Comercios y Motor de Categorización
  ├─ Idempotencia (Evita duplicados por externalId)
  └─ Persistencia (Prisma ORM)
       │
       ▼
[ Base de Datos (SQLite local / PostgreSQL / Supabase) ]
       ▲
       │
[ Consumidores / Dashboard / Exportación ]
  ├─ Web Dashboard (KPIs, Gráficos por categoría, Feed en tiempo real)
  ├─ Exportación Directa (GET /api/v1/transactions/export?format=csv|json)
  └─ Simulador de Webhooks BHD
```

---

## 🚀 Inicio Rápido

### Requisitos Previos
- **Node.js**: v20 o superior (v26 soportado)
- **npm** o **pnpm**
- *(Opcional)* **Docker & Docker Compose**

### 1. Instalación y Configuración Local

```bash
# 1. Clonar e ingresar al repositorio
git clone <repo-url>
cd bills

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env

# 4. Generar el cliente Prisma y sincronizar la base de datos
npx prisma generate
npx prisma db push

# 5. Iniciar servidor en modo desarrollo
npm run dev
```

El servidor iniciará en:
- 🌐 **Dashboard & API**: `http://localhost:3000`
- 📡 **Endpoint de Ingesta**: `http://localhost:3000/api/v1/transactions`
- 📊 **Exportar CSV**: `http://localhost:3000/api/v1/transactions/export?format=csv`

---

## 🔄 Configuración del Flujo n8n

El repositorio incluye el workflow listo para producción en [`n8n/bhd-transaction-workflow.json`](n8n/bhd-transaction-workflow.json) y el código del parser en [`n8n/bhd-parser-code-node.js`](n8n/bhd-parser-code-node.js).

### Pasos para Importar en n8n:
1. Abre tu instancia de **n8n**.
2. Haz clic en **Workflows** > **Import from File...** y selecciona [`n8n/bhd-transaction-workflow.json`](n8n/bhd-transaction-workflow.json).
3. Conecta tus credenciales de **Gmail OAuth2** en el nodo `Gmail Trigger`.
4. En el nodo `HTTP Request Node`, actualiza la URL a tu servidor API (por ejemplo `http://localhost:3000/api/v1/transactions` o tu dominio público).
5. Configura el header `x-api-key` con el valor de tu `.env` (`bhd_secret_token_123456`).
6. Activa el workflow.

---

## 📋 Contrato de Datos (API Contract)

### `POST /api/v1/transactions` (Ingesta de Transacción)
Header requerido: `x-api-key: bhd_secret_token_123456`

#### Request Payload:
```json
{
  "externalId": "18f4a9b2c3d4e5f6",
  "cardLast4": "0380",
  "cardType": "Visa Débito Intl",
  "rawMerchant": "SM BRAVO LAS AMERICAS",
  "amount": 1530.00,
  "currency": "DOP",
  "status": "Aprobada",
  "transactionType": "Compra",
  "transactionDate": "2026-08-18T19:14:00.000Z",
  "source": "BHD_EMAIL"
}
```

#### Respuesta 201 Created (Nueva Transacción):
```json
{
  "success": true,
  "duplicate": false,
  "message": "Transaction recorded successfully",
  "data": {
    "id": "c3e987c2-1234-4567-89ab-cdef01234567",
    "externalId": "18f4a9b2c3d4e5f6",
    "cardLast4": "0380",
    "cardType": "Visa Débito Intl",
    "rawMerchant": "SM BRAVO LAS AMERICAS",
    "merchant": "Supermercados Bravo",
    "category": "Supermercado",
    "amount": 1530.00,
    "currency": "DOP",
    "status": "Aprobada",
    "transactionType": "Compra",
    "transactionDate": "2026-08-18T19:14:00.000Z",
    "source": "BHD_EMAIL",
    "createdAt": "2026-08-18T19:14:05.000Z"
  }
}
```

#### Idempotencia (Respuesta 200 OK si ya existía `externalId`):
```json
{
  "success": true,
  "duplicate": true,
  "message": "Transaction already processed (Idempotent)",
  "data": { ... }
}
```

---

## 📑 Endpoints de la API

| Método | Endpoint | Descripción | Autenticación |
|---|---|---|---|
| `POST` | `/api/v1/transactions` | Ingesta individual de transacción | `x-api-key` |
| `POST` | `/api/v1/transactions/batch` | Ingesta masiva de transacciones | `x-api-key` |
| `GET` | `/api/v1/transactions` | Feed con filtros (`month`, `category`, `currency`, `search`, `page`, `limit`) y totales | Opcional |
| `GET` | `/api/v1/transactions/:id` | Detalle de transacción | Opcional |
| `PATCH` | `/api/v1/transactions/:id` | Editar categoría, nombre o notas | Opcional |
| `DELETE` | `/api/v1/transactions/:id` | Eliminar transacción | Opcional |
| `GET` | `/api/v1/transactions/export` | Exportación en `format=csv` (con BOM para Excel) o `format=json` | Opcional |
| `GET` | `/api/v1/stats/summary` | Métricas financieras, desglose por categorías y top comercios | Opcional |
| `GET` | `/api/v1/categories` | Lista de categorías con conteo | Opcional |
| `GET` | `/api/v1/rules` | Lista de reglas de categorización personalizadas | Opcional |
| `POST` | `/api/v1/rules` | Crear regla de categorización personalizada | `x-api-key` |
| `DELETE` | `/api/v1/rules/:id` | Eliminar regla personalizada | `x-api-key` |

---

## 🧠 Motor de Normalización y Categorización

El sistema incluye reglas automáticas para los comercios más comunes de República Dominicana:
- **Supermercados**: Bravo, Nacional, Jumbo, La Sirena, Hipermercados Olé, Plaza Lama, PriceSmart, Carrefour.
- **Restaurantes & Delivery**: PedidosYa, Uber Eats, McDonald's, Wendy's, Burger King, Domino's, KFC, Starbucks, Chef Pepper.
- **Transporte & Combustible**: Uber, InDrive, Cabify, Paso Rápido, TotalEnergies, Sunix, Shell, Texaco, Nexgen.
- **Salud & Farmacia**: Farmacia Carol, Farmacia GBC, Los Hidalgos, Amadita, Referencia, Cedimat.
- **Servicios & Telecomunicaciones**: Claro Dominicana, Altice, Viva, EdeEste, EdeSur, EdeNorte, CAASD.
- **Suscripciones & Tecnología**: Netflix, Spotify, Apple, Google, Disney+, Max, OpenAI (ChatGPT), AWS, GitHub.
- **Compras Online**: Amazon, Shein, AliExpress, Temu.

*(Puedes agregar reglas adicionales en cualquier momento desde el Dashboard o mediante `POST /api/v1/rules`).*

---

## 🧪 Pruebas Automatizadas

El proyecto cuenta con una suite completa de pruebas unitarias y de integración con **Vitest**:

```bash
# Ejecutar todas las pruebas
npm test

# Modo observación (watch)
npm run test:watch
```

Cobertura de pruebas:
- ✅ **Parser BHD**: Extracción de montos (DOP/USD), fechas dominicanas, tarjetas, comercios y estados.
- ✅ **Categorización**: Normalización de nombres de comercios y asignación de categorías.
- ✅ **API Integration**: Validación de schemas Zod, idempotencia ante duplicados, batch ingestion, exportación CSV con UTF-8 BOM, estadísticas y CRUD.

---

## 🐳 Despliegue con Docker

```bash
# Iniciar la API con Docker Compose
docker compose up -d --build
```
