import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { initDb, closeDb } from '../src/database/index.js';

describe('Transaction Ledger API Integration Tests', () => {
  let app: any;

  before(() => {
    // Initialize in-memory database for clean test isolation
    process.env.NODE_ENV = 'test';
    initDb(':memory:');
    app = createApp();
  });

  describe('1. Create Account API', () => {
    test('POST /api/accounts should create account with initial balance strictly 0', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .send({ name: 'Alice Wonderland' });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.name, 'Alice Wonderland');
      assert.strictEqual(res.body.data.balance, 0);
      assert.ok(res.body.data.id);
      assert.ok(res.body.data.created_at);
    });

    test('POST /api/accounts should fail if name is missing or empty', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .send({ name: '   ' });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    });

    test('POST /api/accounts should reject attempts to set an initial balance', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .send({ name: 'Bob Hacker', balance: 500 });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    });
  });

  describe('2. Add Transaction API & Balance Rules', () => {
    let testAccountId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/accounts')
        .send({ name: 'Charlie Tester' });
      testAccountId = res.body.data.id;
    });

    test('Credit transaction should increase account balance', async () => {
      const creditRes = await request(app)
        .post(`/api/accounts/${testAccountId}/transactions`)
        .send({
          type: 'credit',
          amount: 100,
          reference_id: 'DEP-001',
          description: 'Initial deposit',
        });

      assert.strictEqual(creditRes.status, 201);
      assert.strictEqual(creditRes.body.data.amount, 100);
      assert.strictEqual(creditRes.body.data.type, 'credit');

      // Verify balance is now 100
      const balRes = await request(app).get(`/api/accounts/${testAccountId}/balance`);
      assert.strictEqual(balRes.status, 200);
      assert.strictEqual(balRes.body.data.balance, 100);
    });

    test('Debit transaction should decrease account balance', async () => {
      // First credit 100
      await request(app)
        .post(`/api/accounts/${testAccountId}/transactions`)
        .send({ type: 'credit', amount: 100, reference_id: 'DEP-100' });

      // Now debit 30
      const debitRes = await request(app)
        .post(`/api/accounts/${testAccountId}/transactions`)
        .send({
          type: 'debit',
          amount: 30,
          reference_id: 'WDL-001',
          description: 'ATM withdrawal',
        });

      assert.strictEqual(debitRes.status, 201);
      assert.strictEqual(debitRes.body.data.amount, 30);

      // Verify balance is now 70
      const balRes = await request(app).get(`/api/accounts/${testAccountId}/balance`);
      assert.strictEqual(balRes.body.data.balance, 70);
    });

    test('Debit transaction exceeding balance must be rejected and balance remains unchanged', async () => {
      // Account balance is 0 initially. Attempt to debit 50
      const debitRes = await request(app)
        .post(`/api/accounts/${testAccountId}/transactions`)
        .send({
          type: 'debit',
          amount: 50,
          reference_id: 'WDL-OVERDRAFT',
          description: 'Overdraft attempt',
        });

      assert.strictEqual(debitRes.status, 422);
      assert.strictEqual(debitRes.body.error.code, 'INSUFFICIENT_BALANCE');

      // Balance must still be 0
      const balRes = await request(app).get(`/api/accounts/${testAccountId}/balance`);
      assert.strictEqual(balRes.body.data.balance, 0);
    });

    test('Duplicate reference_id for same account must be rejected and balance unchanged', async () => {
      // First transaction
      await request(app)
        .post(`/api/accounts/${testAccountId}/transactions`)
        .send({ type: 'credit', amount: 50, reference_id: 'REF-DUP-1' });

      // Duplicate submission
      const dupRes = await request(app)
        .post(`/api/accounts/${testAccountId}/transactions`)
        .send({ type: 'credit', amount: 50, reference_id: 'REF-DUP-1' });

      assert.strictEqual(dupRes.status, 409);
      assert.strictEqual(dupRes.body.error.code, 'DUPLICATE_TRANSACTION');

      // Balance must still be 50, not 100!
      const balRes = await request(app).get(`/api/accounts/${testAccountId}/balance`);
      assert.strictEqual(balRes.body.data.balance, 50);
    });

    test('Same reference_id CAN be used for DIFFERENT accounts', async () => {
      // Create second account
      const acc2Res = await request(app)
        .post('/api/accounts')
        .send({ name: 'Second Account' });
      const acc2Id = acc2Res.body.data.id;

      // Post same reference_id to account 1
      const res1 = await request(app)
        .post(`/api/accounts/${testAccountId}/transactions`)
        .send({ type: 'credit', amount: 25, reference_id: 'SHARED-REF-99' });
      assert.strictEqual(res1.status, 201);

      // Post same reference_id to account 2
      const res2 = await request(app)
        .post(`/api/accounts/${acc2Id}/transactions`)
        .send({ type: 'credit', amount: 35, reference_id: 'SHARED-REF-99' });
      assert.strictEqual(res2.status, 201);
    });

    test('Transaction with non-existent account ID returns 404', async () => {
      const res = await request(app)
        .post('/api/accounts/non-existent-id/transactions')
        .send({ type: 'credit', amount: 50, reference_id: 'REF-404' });

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.error.code, 'NOT_FOUND');
    });

    test('Transaction with negative amount or invalid type returns 400', async () => {
      const res1 = await request(app)
        .post(`/api/accounts/${testAccountId}/transactions`)
        .send({ type: 'credit', amount: -10, reference_id: 'REF-NEG' });
      assert.strictEqual(res1.status, 400);

      const res2 = await request(app)
        .post(`/api/accounts/${testAccountId}/transactions`)
        .send({ type: 'invalid_type', amount: 10, reference_id: 'REF-INVALID' });
      assert.strictEqual(res2.status, 400);
    });
  });

  describe('3. Get Account Balance API', () => {
    test('GET /api/accounts/:id/balance returns account balance and ID', async () => {
      const accRes = await request(app)
        .post('/api/accounts')
        .send({ name: 'Dave Balance' });
      const accId = accRes.body.data.id;

      await request(app)
        .post(`/api/accounts/${accId}/transactions`)
        .send({ type: 'credit', amount: 75.50, reference_id: 'REF-7550' });

      const res = await request(app).get(`/api/accounts/${accId}/balance`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.account_id, accId);
      assert.strictEqual(res.body.data.balance, 75.50);
    });

    test('GET /api/accounts/:id/balance returns 404 for missing account', async () => {
      const res = await request(app).get('/api/accounts/missing-id/balance');
      assert.strictEqual(res.status, 404);
    });
  });

  describe('4. Get Transaction History & Filtering / Pagination', () => {
    let accId: string;

    before(async () => {
      const accRes = await request(app)
        .post('/api/accounts')
        .send({ name: 'History Test Account' });
      accId = accRes.body.data.id;

      // Add 5 transactions
      await request(app).post(`/api/accounts/${accId}/transactions`).send({ type: 'credit', amount: 100, reference_id: 'TX-1', description: 'Tx 1' });
      await request(app).post(`/api/accounts/${accId}/transactions`).send({ type: 'credit', amount: 50, reference_id: 'TX-2', description: 'Tx 2' });
      await request(app).post(`/api/accounts/${accId}/transactions`).send({ type: 'debit', amount: 30, reference_id: 'TX-3', description: 'Tx 3' });
      await request(app).post(`/api/accounts/${accId}/transactions`).send({ type: 'credit', amount: 20, reference_id: 'TX-4', description: 'Tx 4' });
      await request(app).post(`/api/accounts/${accId}/transactions`).send({ type: 'debit', amount: 10, reference_id: 'TX-5', description: 'Tx 5' });
    });

    test('GET transactions should return latest-first order', async () => {
      const res = await request(app).get(`/api/accounts/${accId}/transactions`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.transactions.length, 5);
      // The latest one added (TX-5) should be first
      assert.strictEqual(res.body.transactions[0].reference_id, 'TX-5');
      assert.strictEqual(res.body.transactions[4].reference_id, 'TX-1');
    });

    test('GET transactions filtered by credit should only return credit transactions', async () => {
      const res = await request(app).get(`/api/accounts/${accId}/transactions?type=credit`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.total_records, 3);
      res.body.transactions.forEach((tx: any) => {
        assert.strictEqual(tx.type, 'credit');
      });
    });

    test('GET transactions filtered by debit should only return debit transactions', async () => {
      const res = await request(app).get(`/api/accounts/${accId}/transactions?type=debit`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.total_records, 2);
      res.body.transactions.forEach((tx: any) => {
        assert.strictEqual(tx.type, 'debit');
      });
    });

    test('GET transactions pagination limit and page metadata', async () => {
      const res = await request(app).get(`/api/accounts/${accId}/transactions?page=1&limit=2`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.current_page, 1);
      assert.strictEqual(res.body.page_size, 2);
      assert.strictEqual(res.body.total_records, 5);
      assert.strictEqual(res.body.total_pages, 3);
      assert.strictEqual(res.body.transactions.length, 2);
    });
  });

  describe('5. Bonus Money Transfer API', () => {
    let accA: string;
    let accB: string;

    beforeEach(async () => {
      const a = await request(app).post('/api/accounts').send({ name: 'Sender A' });
      const b = await request(app).post('/api/accounts').send({ name: 'Receiver B' });
      accA = a.body.data.id;
      accB = b.body.data.id;

      // Seed Account A with 100, Account B with 50 (from prompt example!)
      await request(app).post(`/api/accounts/${accA}/transactions`).send({ type: 'credit', amount: 100, reference_id: 'SEED-A' });
      await request(app).post(`/api/accounts/${accB}/transactions`).send({ type: 'credit', amount: 50, reference_id: 'SEED-B' });
    });

    test('Transfer 30 from Account A to Account B', async () => {
      const transferRes = await request(app)
        .post('/api/transfers')
        .send({
          source_account_id: accA,
          destination_account_id: accB,
          amount: 30,
          reference_id: 'TRF-TEST-30',
          description: 'Payment for lunch',
        });

      assert.strictEqual(transferRes.status, 201);
      assert.strictEqual(transferRes.body.success, true);

      // Check Account A balance (100 - 30 = 70)
      const balA = await request(app).get(`/api/accounts/${accA}/balance`);
      assert.strictEqual(balA.body.data.balance, 70);

      // Check Account B balance (50 + 30 = 80)
      const balB = await request(app).get(`/api/accounts/${accB}/balance`);
      assert.strictEqual(balB.body.data.balance, 80);
    });

    test('Transfer fails and rolls back if source account has insufficient funds', async () => {
      const transferRes = await request(app)
        .post('/api/transfers')
        .send({
          source_account_id: accA,
          destination_account_id: accB,
          amount: 250, // exceeds Account A's 100
          reference_id: 'TRF-OVERDRAW',
        });

      assert.strictEqual(transferRes.status, 422);

      // Balances must remain unchanged
      const balA = await request(app).get(`/api/accounts/${accA}/balance`);
      assert.strictEqual(balA.body.data.balance, 100);

      const balB = await request(app).get(`/api/accounts/${accB}/balance`);
      assert.strictEqual(balB.body.data.balance, 50);
    });

    test('Transfer fails if duplicate transfer reference_id is reused', async () => {
      const res1 = await request(app)
        .post('/api/transfers')
        .send({
          source_account_id: accA,
          destination_account_id: accB,
          amount: 10,
          reference_id: 'TRF-UNIQUE-CHECK',
        });
      assert.strictEqual(res1.status, 201);

      const res2 = await request(app)
        .post('/api/transfers')
        .send({
          source_account_id: accA,
          destination_account_id: accB,
          amount: 10,
          reference_id: 'TRF-UNIQUE-CHECK',
        });
      assert.strictEqual(res2.status, 409);
      assert.strictEqual(res2.body.error.code, 'DUPLICATE_TRANSACTION');
    });

    test('Transfer fails if destination account does not exist', async () => {
      const res = await request(app)
        .post('/api/transfers')
        .send({
          source_account_id: accA,
          destination_account_id: 'non-existent-dest',
          amount: 10,
          reference_id: 'TRF-NO-DEST',
        });
      assert.strictEqual(res.status, 404);
    });
  });

  describe('6. Currency Precision & Direct Endpoints', () => {
    test('Floating point accuracy: 0.10 + 0.20 strictly equals 0.30 without IEEE-754 drift', async () => {
      const acc = await request(app).post('/api/accounts').send({ name: 'Precision Tester' });
      const id = acc.body.data.id;

      await request(app).post(`/api/accounts/${id}/transactions`).send({ type: 'credit', amount: 0.1, reference_id: 'PREC-1' });
      await request(app).post(`/api/accounts/${id}/transactions`).send({ type: 'credit', amount: 0.2, reference_id: 'PREC-2' });

      const bal = await request(app).get(`/api/accounts/${id}/balance`);
      assert.strictEqual(bal.body.data.balance, 0.3);
    });

    test('Direct POST /transactions with account_id in body', async () => {
      const acc = await request(app).post('/api/accounts').send({ name: 'Direct Route User' });
      const id = acc.body.data.id;

      const tx = await request(app)
        .post('/transactions')
        .send({
          account_id: id,
          type: 'credit',
          amount: 50,
          reference_id: 'DIR-001',
          description: 'Direct transaction endpoint',
        });
      assert.strictEqual(tx.status, 201);
      assert.strictEqual(tx.body.data.account_id, id);

      // Verify GET /transactions/:transactionId
      const txId = tx.body.data.id;
      const getTx = await request(app).get(`/transactions/${txId}`);
      assert.strictEqual(getTx.status, 200);
      assert.strictEqual(getTx.body.data.id, txId);
      assert.strictEqual(getTx.body.data.reference_id, 'DIR-001');
    });
  });
});
