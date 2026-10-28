# Transaction Ledger API Documentation

Welcome to the **Transaction Ledger API** documentation. This service provides financial ledger primitives including account management, atomic credit and debit operations, historical ledger queries with filtering and pagination, and atomic money transfers between accounts.

---

## Base URLs

- **Local Server**: `http://localhost:3000`
- **Interactive Swagger UI**: `http://localhost:3000/api-docs`
- **Web Dashboard**: `http://localhost:3000/`

All endpoints are also available with or without the `/api` prefix (e.g., both `/api/accounts` and `/accounts` work identically).

---

## Standard Error Response Format

All error responses adhere to a consistent, predictable JSON schema:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable explanation of error",
    "details": null
  }
}
```

### Common HTTP Status Codes

| Status Code | Meaning | Example Scenarios |
|-------------|---------|-------------------|
| `200 OK` | Request succeeded | Account fetched, balance retrieved, ledger history queried |
| `201 Created` | Resource created | Account created, transaction added, transfer executed |
| `400 Bad Request` | Validation failure | Missing required fields, negative amount, client setting initial balance |
| `404 Not Found` | Resource not found | Account ID does not exist |
| `409 Conflict` | Duplicate transaction | `reference_id` already exists for this account |
| `422 Unprocessable` | Domain rule rejected | Debit amount exceeds account balance |
| `500 Server Error` | Unexpected failure | Database connection or unhandled system error |

---

## Endpoints

### 1. Create Account

Creates a new account holder. The initial balance is **always strictly 0.00**.

- **URL**: `POST /api/accounts`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Body
```json
{
  "name": "Alice Smith"
}
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "id": "a813b19e-e8fd-426b-8ee3-45f8f533bf4e",
    "name": "Alice Smith",
    "balance": 0,
    "created_at": "2026-10-28T15:22:44.309Z"
  }
}
```

#### Validation Error (`400 Bad Request`)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed for request body",
    "details": [
      { "field": "name", "message": "Account name cannot be empty" }
    ]
  }
}
```

---

### 2. Get Account Balance

Fetches the current real-time balance for an account.

- **URL**: `GET /api/accounts/:accountId/balance`
- **Method**: `GET`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "account_id": "a813b19e-e8fd-426b-8ee3-45f8f533bf4e",
    "balance": 150.00,
    "name": "Alice Smith",
    "created_at": "2026-10-28T15:22:44.309Z"
  }
}
```

#### Not Found (`404 Not Found`)
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Account with ID '...' was not found"
  }
}
```

---

### 3. Add Transaction

Applies a credit or debit to an account. Updating balance and inserting the transaction record occur within one atomic database transaction.

- **URL**: `POST /api/accounts/:accountId/transactions`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Body
```json
{
  "type": "credit",
  "amount": 100.50,
  "reference_id": "INV-2026-001",
  "description": "Consulting invoice payment"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `"credit"` \| `"debit"` | Yes | Transaction type |
| `amount` | Number | Yes | Positive number (> 0), max 2 decimal places |
| `reference_id` | String | Yes | Unique identifier for transaction within account |
| `description` | String | No | Optional human-readable description |

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "id": "329afa65-7f56-4053-8e5d-af83c459b788",
    "account_id": "a813b19e-e8fd-426b-8ee3-45f8f533bf4e",
    "type": "credit",
    "amount": 100.50,
    "description": "Consulting invoice payment",
    "reference_id": "INV-2026-001",
    "created_at": "2026-10-28T15:30:12.114Z"
  }
}
```

#### Insufficient Balance (`422 Unprocessable Entity`)
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Debit transaction rejected: insufficient balance. Current balance is 100.00, requested 150.00"
  }
}
```

#### Duplicate Reference ID (`409 Conflict`)
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_TRANSACTION",
    "message": "A transaction with reference_id 'INV-2026-001' already exists for account '...'"
  }
}
```

---

### 4. Get Transaction History

Fetches all transactions for an account sorted in **latest-first** order (`created_at DESC`), with pagination and optional filtering by type.

- **URL**: `GET /api/accounts/:accountId/transactions`
- **Method**: `GET`
- **Query Parameters**:
  - `type`: Optional (`credit` or `debit`). If omitted, returns all.
  - `page`: Optional integer `>= 1` (default: `1`).
  - `limit`: Optional integer `1-100` (default: `10`).

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "current_page": 1,
  "page_size": 10,
  "total_records": 25,
  "total_pages": 3,
  "transactions": [
    {
      "id": "5a41bf39-4467-4222-9214-e51c8636ba2b",
      "account_id": "a813b19e-e8fd-426b-8ee3-45f8f533bf4e",
      "type": "credit",
      "amount": 250.00,
      "description": "Client deposit",
      "reference_id": "DEP-902",
      "created_at": "2026-10-28T15:35:10.000Z"
    },
    {
      "id": "329afa65-7f56-4053-8e5d-af83c459b788",
      "account_id": "a813b19e-e8fd-426b-8ee3-45f8f533bf4e",
      "type": "credit",
      "amount": 100.50,
      "description": "Consulting invoice payment",
      "reference_id": "INV-2026-001",
      "created_at": "2026-10-28T15:30:12.114Z"
    }
  ]
}
```

---

### 5. Transfer Funds (Bonus)

Atomically transfers funds from a source account to a destination account. A debit is posted to the source and a credit to the destination. If any part fails, the entire transaction is rolled back.

- **URL**: `POST /api/transfers`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Body
```json
{
  "source_account_id": "a813b19e-e8fd-426b-8ee3-45f8f533bf4e",
  "destination_account_id": "f512c21e-12fa-4a2b-9be2-12a8f633cc12",
  "amount": 30.00,
  "reference_id": "TRF-2026-001",
  "description": "Office lunch reimbursement"
}
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "transfer_id": "99ea78f1-628a-4efb-86d4-86a34cd369ef",
    "source_account_id": "a813b19e-e8fd-426b-8ee3-45f8f533bf4e",
    "destination_account_id": "f512c21e-12fa-4a2b-9be2-12a8f633cc12",
    "amount": 30.00,
    "reference_id": "TRF-2026-001",
    "description": "Office lunch reimbursement",
    "created_at": "2026-10-28T15:40:00.000Z",
    "source_transaction": {
      "id": "e812d45a-8b4e-4e6f-bb54-15f187a544c2",
      "account_id": "a813b19e-e8fd-426b-8ee3-45f8f533bf4e",
      "type": "debit",
      "amount": 30.00,
      "description": "Transfer to Bob: Office lunch reimbursement",
      "reference_id": "TRF-OUT-TRF-2026-001",
      "created_at": "2026-10-28T15:40:00.000Z"
    },
    "destination_transaction": {
      "id": "bb33c11a-1122-3344-5566-778899aabbcc",
      "account_id": "f512c21e-12fa-4a2b-9be2-12a8f633cc12",
      "type": "credit",
      "amount": 30.00,
      "description": "Transfer from Alice: Office lunch reimbursement",
      "reference_id": "TRF-IN-TRF-2026-001",
      "created_at": "2026-10-28T15:40:00.000Z"
    }
  }
}
```

---

## Quick cURL Testing Examples

```bash
# 1. Health check
curl -X GET http://localhost:3000/api/health

# 2. Create Account
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice"}'

# 3. Add Credit Transaction
curl -X POST http://localhost:3000/api/accounts/<ACCOUNT_ID>/transactions \
  -H "Content-Type: application/json" \
  -d '{"type": "credit", "amount": 100, "reference_id": "REF-001", "description": "Deposit"}'

# 4. Add Debit Transaction
curl -X POST http://localhost:3000/api/accounts/<ACCOUNT_ID>/transactions \
  -H "Content-Type: application/json" \
  -d '{"type": "debit", "amount": 30, "reference_id": "REF-002", "description": "Withdrawal"}'

# 5. Check Balance
curl -X GET http://localhost:3000/api/accounts/<ACCOUNT_ID>/balance

# 6. View Transactions (page 1, limit 10, credits only)
curl -X GET "http://localhost:3000/api/accounts/<ACCOUNT_ID>/transactions?type=credit&page=1&limit=10"
```
