import { z } from 'zod';
import { ErpRecord, PaymentRecord, BankRecord } from './types';

export const erpSchema = z.object({
  invoice_id: z.string().min(1, 'invoice_id is required'),
  customer_id: z.string().default('UNKNOWN'),
  amount: z.coerce.number().min(0, 'amount must be positive'),
  invoice_date: z.string().min(1, 'invoice_date is required'),
  status: z.string().default('POSTED'),
});

export const paymentSchema = z.object({
  payment_id: z.string().min(1, 'payment_id is required'),
  invoice_id: z.string().min(1, 'invoice_id is required'),
  amount: z.coerce.number().min(0, 'amount must be positive'),
  payment_date: z.string().min(1, 'payment_date is required'),
  fee: z.coerce.number().default(0),
  status: z.string().default('SUCCESS'),
});

export const bankSchema = z.object({
  settlement_id: z.string().min(1, 'settlement_id is required'),
  payment_id: z.string().min(1, 'payment_id is required'),
  amount: z.coerce.number().min(0, 'amount must be positive'),
  settlement_date: z.string().min(1, 'settlement_date is required'),
  status: z.string().default('SETTLED'),
});

export function validateErpRecords(rawRows: Record<string, any>[]): { valid: ErpRecord[]; invalid: any[] } {
  const valid: ErpRecord[] = [];
  const invalid: any[] = [];

  for (const row of rawRows) {
    const res = erpSchema.safeParse(row);
    if (res.success) {
      valid.push({ ...res.data, raw: row });
    } else {
      invalid.push({ row, errors: res.error.flatten() });
    }
  }

  return { valid, invalid };
}

export function validatePaymentRecords(rawRows: Record<string, any>[]): { valid: PaymentRecord[]; invalid: any[] } {
  const valid: PaymentRecord[] = [];
  const invalid: any[] = [];

  for (const row of rawRows) {
    const res = paymentSchema.safeParse(row);
    if (res.success) {
      valid.push({ ...res.data, raw: row });
    } else {
      invalid.push({ row, errors: res.error.flatten() });
    }
  }

  return { valid, invalid };
}

export function validateBankRecords(rawRows: Record<string, any>[]): { valid: BankRecord[]; invalid: any[] } {
  const valid: BankRecord[] = [];
  const invalid: any[] = [];

  for (const row of rawRows) {
    const res = bankSchema.safeParse(row);
    if (res.success) {
      valid.push({ ...res.data, raw: row });
    } else {
      invalid.push({ row, errors: res.error.flatten() });
    }
  }

  return { valid, invalid };
}
