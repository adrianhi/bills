# Product Overview: Modern Personal Finance for the Dominican Republic

---

## 1. Executive Summary

This platform is a **proactive personal finance and expense intelligence SaaS** built from the ground up for the **Dominican Republic (RD)** banking ecosystem.

Unlike traditional budgeting apps that demand tedious manual transaction entry or rely on US/European open-banking aggregators (like Plaid, which do not operate in the Dominican Republic), this product provides **frictionless, automated financial tracking**. By connecting with read-only authorization to Gmail, it securely parses transactional email notifications from major Dominican banks—including **Banco BHD, Banreservas, Banco Popular, and Qik Banco Digital**—normalizing them into a single, unified financial dashboard with real-time proactive intelligence.

---

## 2. The Problem: The Dominican Financial Reality

1. **Fragmented Banking Ecosystem:**
   - The average Dominican professional or consumer typically holds accounts across 2 to 3 banks (e.g., payroll deposited in Banreservas or Popular, daily spending or credit cards with BHD or Qik).
   - Each bank operates inside a walled garden. Users must open 3 separate banking apps just to figure out their total balance or see what they spent.

2. **Absence of Open Banking APIs:**
   - In the US and Europe, apps connect directly to banks via Plaid, MX, or Tink. In the Dominican Republic, no such open banking infrastructure exists.
   - Most users abandon budgeting apps within 10 days because manual receipt entry is exhausting.

3. **The "Quincena" Lifestyle & Missing Visibility:**
   - Financial life in the Dominican Republic revolves strictly around the **quincena** (the 15th and 30th of each month).
   - By the 20th or 25th of the month, people commonly face the universal question: *"¿A dónde se fueron mis cuartos?"* ("Where did all my money go?").
   - Existing bank statements are purely historical and reactive; they don't tell the user what they can safely spend today.

---

## 3. How It Works: The Automated Engine

```text
[ Dominican Banks ]
  BHD • Popular • Banreservas • Qik Digital
           │
           │ (Transactional Notification Emails)
           ▼
[ Secure Read-Only Ingestion ]
  Gmail OAuth (Read-only) ──> ParserRegistry ──> NormalizedTransaction
                                                       │
                                                       ▼
[ Automated Intelligence Engine ]
  ├── Safe-to-Spend Daily Allowance (Calculated per payday cycle)
  ├── Recurring Bills & Subscription Radar (Netflix, Gym, Loans, Utilities)
  ├── Expense Simulator ("Can I afford this right now?")
  ├── Weekly Check-in Ritual & Spending Digest
  └── Smart Proactive Action Feed
```

### Bank-Grade Security & Privacy
- **Zero Banking Credentials Required:** Users never enter bank usernames, passwords, or PINs.
- **Read-Only Email Access:** Scoped exclusively to transaction notifications from verified bank senders (`alertas@bhd.com.do`, `notificaciones@banreservas.com`, etc.).
- **Data Minimization:** Raw email contents are never stored for successful transactions; tokens and sensitive payloads are encrypted with **AES-256-GCM**.
- **Tenant Isolation:** Every user is isolated inside their own Workspace with PostgreSQL Row Level Security (RLS).

---

## 4. Core Features & Capabilities

### A. Proactive Action Feed & Home Dashboard
- Real-time insight cards that immediately alert users if spending pace is too high or if an unusual charge took place.
- 1-tap quick triage modal for unreviewed transactions.

### B. "Safe-to-Spend" Daily Allowance
- Calculates a dynamic, daily spending margin: *(Remaining Discretionary Income ÷ Days Left Until Next Payday)*.
- Prevents end-of-month cash shortages before they happen.

### C. Recurring Expenses Hub & Bill Radar
- Automatically detects recurring payments (insurance, gym memberships, streaming services, maintenance, tuition).
- Flags price increases (e.g., streaming service raised its rate) or missed expected bills.
- Calculates total **Fixed Monthly Burden** and **Free Discretionary Cash**.

### D. Expense Simulator: "¿Puedo darme este gusto?" ("Can I afford this?")
- An instant pre-purchase calculator. Users enter an amount (e.g., DOP $3,500 for dinner or shopping) and the simulator predicts the exact impact on their daily allowance and monthly budget.
- Returns clear verdicts: **SAFE**, **TIGHT**, or **OVERSPEND**.

### E. Weekly Check-in & Email Digest
- A clean, 2-minute weekly reflection comparing spend vs. the previous week, highlighting the largest merchant and showing the payday compass.

### F. Multi-Bank & Cash Tracking
- Supports Banco BHD, Banreservas, Banco Popular, and Qik Banco Digital.
- Includes quick manual cash entry for colmado, delivery, and cash tips.
- Clean PDF and Excel exports for personal accounting or tax prep.

---

## 5. Brand Identity & Naming Exploration

The current working title (`bills.`) is too generic and Americanized. In the Dominican market, financial apps succeed when they combine **modern, world-class fintech aesthetics** (clean typography, dark mode, swift UX like Nubank or Monzo) with **authentic Dominican cultural resonance**.

### Naming Direction: "The Modern Dominican Fintech"

Here are the top naming concepts along this branch:

| Name | Linguistic Origin & Cultural Meaning | Brand Personality | Sample Tagline / Copy |
| :--- | :--- | :--- | :--- |
| **`Cuadra`** / **`Cuadra.`** ⭐ *(Top Recommendation)* | From the Dominican phrase *"vamos a cuadrar"*, *"déjame cuadrar la quincena"*, *"estoy cuadrao"*. Means to balance accounts, align numbers, and achieve complete financial order. | Modern, authoritative, punchy, sharp, fintech-grade. Similar energy to *Nubank*, *RappiCard*, or *Fintual*. | *Tus finanzas, claras y al día.*<br>*El control de tu quincena en piloto automático.* |
| **`El Cuadre`** | The direct noun for the act of balancing the ledger. Highly recognizable in Dominican street and business culture. | Relatable, down-to-earth, transparent, conversational. | *El cuadre que tus cuartos necesitan.*<br>*Cuadra tu mes sin dolor de cabeza.* |
| **`Aldía`** / **`Al Día`** | Refers to being current with payments and debts (*"estar al día"* = zero worries, complete peace of mind). | Calm, premium, reliable, organized. | *Tus bancos y tus gastos, siempre al día.* |
| **`Mis Cuartos`** | *"Cuartos"* is the quintessential Dominican word for money/cash. | Warm, hyper-local, direct, punchy. Answers: *"¿A dónde van mis cuartos?"* | *La app que cuida tus cuartos.* |
| **`El Clavo`** | A *"clavo"* in Dominican slang is an untouchable emergency stash or secret savings that keeps you safe. | Protective, forward-looking, savings-focused. | *Tus gastos en orden, tu clavo seguro.* |
| **`Chelitos`** | *"Cheles"* / *"chelitos"* represents every single coin/peso. Very friendly and empathetic. | Approachable, non-intimidating, youthful. | *Organiza tus chelitos sin estrés.* |

---

## 6. Feedback Questions to Share with Reviewers

When asking friends, prospective users, or advisors for feedback on the name and concept, use these prompt questions:

1. **Name Preference:**
   - *"Between `Cuadra`, `El Cuadre`, and `Mis Cuartos`, which one sounds like an app you would trust with your banking notifications?"*
   - *"Does `Cuadra` sound like a modern, reliable Dominican tech company to you?"*

2. **Value Proposition Resonance:**
   - *"If an app automatically connects with BHD, Popular, Banreservas, or Qik through your receipt emails and tells you your daily spending limit until payday, would you use it?"*
   - *"What is your biggest pain point when managing money in the DR: knowing what you spent, or knowing what you have left to spend?"*

3. **Domain & Brand Appeal:**
   - *"Which web address feels cleaner and more legitimate: `cuadra.do`, `elcuadre.do`, or `miscuartos.do`?"*

---

## 7. Technology Stack Summary

- **Frontend:** React 19, TypeScript, Tailwind CSS, Radix UI, TanStack Query, Recharts, Vite.
- **Backend:** Node.js (Node 22), Express, TypeScript, Prisma ORM, PostgreSQL 16/17 (Supabase).
- **Security & Ingestion:** Google OAuth 2.0 (Gmail Readonly), AES-256-GCM token encryption, Row-Level Security (RLS).
- **Deployment Architecture:** Single unified web process (`PROCESS_ROLE=all`) running API, Web SPA, and background job runners on Render / Docker.
