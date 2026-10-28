# Transaction Ledger API & Banking System

A production-grade, ACID-compliant **Transaction Ledger API** and **Interactive Web Dashboard** built for the **Full Stack Developer Assessment** (Walnut Folks • Confluencr • KALAKAR • Intent Farm).

---

## 🌟 Highlights & Features

* **Strict ACID Atomicity**: Every transaction (credit, debit, and multi-account transfer) uses SQLite transactions (`BEGIN IMMEDIATE ... COMMIT / ROLLBACK`) to prevent race conditions and ensure zero balance inconsistency.
* **Exact Financial Precision**: All currency amounts and balances are stored as integer cents with SQLite check constraints (`CHECK(balance_cents >= 0)`). This completely avoids IEEE-754 floating-point rounding errors (e.g., `0.10 + 0.20 = 0.30`).
* **Zero Initial Balance Guarantee**: Accounts always start with an initial balance of `0.00`. Attempts to manipulate the initial balance from the client are blocked with `400 Bad Request`.
* **Idempotency & Duplicate Prevention**: `reference_id` is unique per account via a composite unique database index (`UNIQUE(account_id, reference_id)`). Re-submitting the same reference rejects with `409 Conflict`, leaving the balance and ledger unchanged. The same reference ID remains valid across different accounts.
* **Transaction Immutability**: Append-only ledger architecture. Once created, transactions cannot be edited or deleted through the API.
* **Pagination & Type Filtering**: Ledger history is returned sorted latest-first (`created_at DESC`), with pagination controls (`page`, `limit`, `total_pages`, `total_records`) and type filtering (`credit`, `debit`, or all).
* **Bonus Feature — Atomic Money Transfer**: Multi-account transfer endpoint (`POST /api/transfers`) that atomically debits the source account and credits the destination account. Partial transfers are strictly prevented.
* **Interactive Full Stack Web Dashboard**: Served directly at `http://localhost:3000/` featuring live account switching, balance stats, credit/debit forms, transfer execution, real-time ledger table, and filter chips.
* **Interactive OpenAPI / Swagger Docs**: Available at `http://localhost:3000/api-docs` with full schema definitions and "Try it out" capabilities.
* **100% Automated Test Coverage**: Comprehensive integration tests covering all requirements, edge cases, floating-point precision, race condition rollbacks, and boundary validations.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js (v20+ / v22+ / v26+) |
| **Language** | TypeScript (ES Modules, Strict Mode) |
| **Framework** | Express.js 5 |
| **Database** | SQLite via built-in `node:sqlite` (Zero external native build dependencies, WAL mode enabled, foreign keys enabled) |
| **Validation** | Zod (Runtime request body, query parameter, and route parameter schema validation) |
| **Documentation**| OpenAPI 3.0 & Swagger UI (`swagger-ui-express`) |
| **Testing** | Node.js native test runner (`node:test`) + Supertest |
| **Frontend** | Vanilla HTML5 / Modern CSS (Custom Design System, Dark Mode) / ES6 JavaScript |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v20.0.0 or higher recommended, tested on Node 26.3.0)
- npm (v9.0.0 or higher)

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/Pratiksha-Kanoja/Confluencr_full_stack_developer.git
cd Confluencr_full_stack_developer
npm install
```

### 3. Run the Development Server
```bash
npm run dev
# or: npm start
```

The application will start on port `3000`:
- **Web Dashboard**: [http://localhost:3000/](http://localhost:3000/)
- **Swagger Documentation**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **Health Check**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

### 4. Run Automated Tests
```bash
npm test
```
Runs the automated integration test suite in an isolated in-memory SQLite database.

### 5. Build for Production
```bash
npm run build
```

---

## 📂 Project Architecture

```
Confluencr_full_stack_developer/
├── src/
│   ├── config/               # App configuration (ports, database paths)
│   ├── database/             # SQLite connection, WAL mode, schema definitions, transaction runner
│   ├── types/                # Domain TypeScript models and DTO interfaces
│   ├── errors/               # Custom AppError classes (NotFoundError, ConflictError, InsufficientBalanceError)
│   ├── validators/           # Zod schema definitions for requests
│   ├── middleware/           # Validation, error handling, and request logging middlewares
│   ├── repositories/         # SQL query layers for Accounts and Transactions
│   ├── services/             # Business logic (AccountService, TransactionService, TransferService)
│   ├── controllers/          # HTTP request handlers
│   ├── routes/               # Express routers (/accounts, /transactions, /transfers)
│   ├── docs/                 # OpenAPI 3.0 specification file (openapi.yaml)
│   ├── public/               # Full Stack Web Dashboard (HTML, CSS, JS)
│   ├── app.ts                # Express application configuration
│   └── server.ts             # Application entrypoint
├── tests/
│   └── api.test.ts           # Comprehensive integration tests
├── ASSUMPTIONS.md            # Business logic and technical design assumptions
├── API_DOCUMENTATION.md      # Detailed API reference and cURL examples
├── README.md                 # Project documentation
├── package.json              # NPM dependencies and scripts
└── tsconfig.json             # TypeScript configuration
```

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `POST` | `/api/accounts` | Create a new account (initial balance = 0) | `201`, `400` |
| `GET` | `/api/accounts` | List all accounts | `200` |
| `GET` | `/api/accounts/:id` | Get account details | `200`, `404` |
| `GET` | `/api/accounts/:id/balance` | Get current balance of an account | `200`, `404` |
| `POST` | `/api/accounts/:id/transactions` | Add a credit or debit transaction | `201`, `400`, `404`, `409`, `422` |
| `GET` | `/api/accounts/:id/transactions` | Get paginated transactions (`type`, `page`, `limit`) | `200`, `404` |
| `GET` | `/api/transactions/:id` | Get a specific transaction by ID | `200`, `404` |
| `POST` | `/api/transfers` | **Bonus**: Transfer funds between two accounts | `201`, `400`, `404`, `409`, `422` |
| `GET` | `/api/health` | Service health status | `200` |

*Note: All endpoints are also accessible without the `/api` prefix (e.g., `POST /accounts`).*

---

## 🧪 Automated Testing Verification

The test suite validates:
1. **Account Creation**: Ensures initial balance is always 0.00 and rejects client attempts to set balance.
2. **Credit & Debit**: Accurately computes new balances and rejects debits exceeding funds without changing balance.
3. **Duplicate Prevention**: Prevents duplicate `reference_id` submissions per account and confirms same reference is permitted on separate accounts.
4. **Pagination & Ordering**: Confirms latest-first order (`created_at DESC`) and verifies pagination metadata.
5. **Bonus Transfer**: Verifies atomic debit/credit between accounts and ensures complete rollback on failure.
6. **Precision & Direct Routes**: Confirms `0.10 + 0.20 = 0.30` precision without binary floating point drift.

To run:
```bash
npm test
```

---

## 📄 Submission Checklist

- [x] **Source Code**: Clean, well-structured, production-ready codebase with layered architecture.
- [x] **README.md**: Comprehensive guide with setup, running instructions, and architecture details.
- [x] **API Documentation**: Detailed markdown API reference in [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) + OpenAPI 3.0 specification in [`src/docs/openapi.yaml`](./src/docs/openapi.yaml) + Interactive Swagger UI at `/api-docs`.
- [x] **Assumptions**: Complete documentation of financial precision, atomicity, idempotency, and business logic in [`ASSUMPTIONS.md`](./ASSUMPTIONS.md).
- [x] **Bonus**: Multi-account Money Transfer implementation + Full Stack Interactive Web Dashboard.
