import { z } from 'zod';

// Currency regex to ensure max 2 decimal places
const CURRENCY_REGEX = /^\d+(\.\d{1,2})?$/;

export const createAccountSchema = z.object({
  name: z.string({
    required_error: 'Account name is required',
    invalid_type_error: 'Account name must be a string',
  })
  .trim()
  .min(1, { message: 'Account name cannot be empty' })
  .max(100, { message: 'Account name cannot exceed 100 characters' }),
  balance: z.undefined({
    invalid_type_error: 'Client is not permitted to set initial balance. Initial balance is always 0.',
  }).optional(),
  initial_balance: z.undefined({
    invalid_type_error: 'Client is not permitted to set initial balance. Initial balance is always 0.',
  }).optional(),
}).strict();

export const addTransactionSchema = z.object({
  type: z.enum(['credit', 'debit'], {
    errorMap: () => ({ message: "Transaction type must be either 'credit' or 'debit'" }),
  }),
  amount: z.number({
    required_error: 'Transaction amount is required',
    invalid_type_error: 'Transaction amount must be a number',
  })
  .positive({ message: 'Amount must be greater than 0' })
  .refine(val => CURRENCY_REGEX.test(val.toString()), {
    message: 'Amount cannot have more than 2 decimal places',
  }),
  reference_id: z.string({
    required_error: 'reference_id is required',
    invalid_type_error: 'reference_id must be a string',
  })
  .trim()
  .min(1, { message: 'reference_id cannot be empty' })
  .max(100, { message: 'reference_id cannot exceed 100 characters' }),
  description: z.string().trim().max(255).optional().default(''),
});

export const getTransactionsQuerySchema = z.object({
  type: z.enum(['credit', 'debit']).optional(),
  page: z.coerce.number().int().min(1, { message: 'Page must be an integer >= 1' }).default(1),
  limit: z.coerce.number().int().min(1, { message: 'Limit must be an integer >= 1' }).max(100, { message: 'Limit cannot exceed 100' }).default(10),
});

export const transferSchema = z.object({
  source_account_id: z.string({
    required_error: 'source_account_id is required',
  }).trim().min(1, { message: 'source_account_id cannot be empty' }),
  destination_account_id: z.string({
    required_error: 'destination_account_id is required',
  }).trim().min(1, { message: 'destination_account_id cannot be empty' }),
  amount: z.number({
    required_error: 'amount is required',
    invalid_type_error: 'amount must be a number',
  })
  .positive({ message: 'Amount must be greater than 0' })
  .refine(val => CURRENCY_REGEX.test(val.toString()), {
    message: 'Amount cannot have more than 2 decimal places',
  }),
  reference_id: z.string({
    required_error: 'reference_id is required',
  }).trim().min(1, { message: 'reference_id cannot be empty' }),
  description: z.string().trim().max(255).optional().default('Money Transfer'),
}).refine(data => data.source_account_id !== data.destination_account_id, {
  message: 'Source and destination accounts must be different',
  path: ['destination_account_id'],
});

export const accountIdParamSchema = z.object({
  accountId: z.string().trim().min(1, { message: 'Account ID is required' }),
});
