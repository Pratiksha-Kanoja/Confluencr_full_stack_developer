export type TransactionType = 'credit' | 'debit';

export interface Account {
  id: string;
  name: string;
  balance: number;
  created_at: string;
}

export interface AccountRecord {
  id: string;
  name: string;
  balance_cents: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  description: string;
  reference_id: string;
  created_at: string;
}

export interface TransactionRecord {
  id: string;
  account_id: string;
  type: TransactionType;
  amount_cents: number;
  description: string;
  reference_id: string;
  created_at: string;
}

export interface TransferResult {
  transfer_id: string;
  source_account_id: string;
  destination_account_id: string;
  amount: number;
  reference_id: string;
  description: string;
  created_at: string;
  source_transaction: Transaction;
  destination_transaction: Transaction;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  current_page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
  transactions: T[];
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, any>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
