import { z } from 'zod';
import { ErpRecord, PaymentRecord, BankRecord } from './types';
import { parseCleanAmount, parseCleanDate } from './normalizer';

const preprocessAmount = (val: any) => parseCleanAmount(val);
const preprocessDate = (val: any) => parseCleanDate(val);
const preprocessString = (val: any) => (val === undefined || val === null ? '' : String(val).trim());

export const erpSchema = z.object({
  invoice_id: z.preprocess(preprocessString, z.string().min(1, 'invoice_id is required')),
  customer_id: z.preprocess(preprocessString, z.string().default('UNKNOWN')),
  amount: z.preprocess(preprocessAmount, z.number().min(0, 'amount must be positive')),
  invoice_date: z.preprocess(preprocessDate, z.string().min(1, 'invoice_date is required')),
  status: z.preprocess(preprocessString, z.string().default('POSTED')),
});

export const paymentSchema = z.object({
  payment_id: z.preprocess(preprocessString, z.string().min(1, 'payment_id is required')),
  invoice_id: z.preprocess(preprocessString, z.string().min(1, 'invoice_id is required')),
  amount: z.preprocess(preprocessAmount, z.number().min(0, 'amount must be positive')),
  payment_date: z.preprocess(preprocessDate, z.string().min(1, 'payment_date is required')),
  fee: z.preprocess(preprocessAmount, z.number().default(0)),
  status: z.preprocess(preprocessString, z.string().default('SUCCESS')),
});

export const bankSchema = z.object({
  settlement_id: z.preprocess(preprocessString, z.string().min(1, 'settlement_id is required')),
  payment_id: z.preprocess(preprocessString, z.string().min(1, 'payment_id is required')),
  amount: z.preprocess(preprocessAmount, z.number().min(0, 'amount must be positive')),
  settlement_date: z.preprocess(preprocessDate, z.string().min(1, 'settlement_date is required')),
  status: z.preprocess(preprocessString, z.string().default('SETTLED')),
});

export function validateErpRecords(rawRows: Record<string, any>[]): { valid: ErpRecord[]; invalid: any[] } {
  const valid: ErpRecord[] = [];
  const invalid: any[] = [];

  for (let idx = 0; idx < rawRows.length; idx++) {
    const row = { ...rawRows[idx] };
    if (!row.invoice_id) {
      row.invoice_id = `ERP-ROW-${idx + 1}`;
    }
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

  for (let idx = 0; idx < rawRows.length; idx++) {
    const row = { ...rawRows[idx] };
    if (!row.payment_id) {
      row.payment_id = `PAY-ROW-${idx + 1}`;
    }
    if (!row.invoice_id) {
      row.invoice_id = row.payment_id;
    }
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

  for (let idx = 0; idx < rawRows.length; idx++) {
    const row = { ...rawRows[idx] };
    if (!row.settlement_id) {
      row.settlement_id = `BNK-ROW-${idx + 1}`;
    }
    if (!row.payment_id) {
      row.payment_id = row.settlement_id;
    }
    const res = bankSchema.safeParse(row);
    if (res.success) {
      valid.push({ ...res.data, raw: row });
    } else {
      invalid.push({ row, errors: res.error.flatten() });
    }
  }

  return { valid, invalid };
}
