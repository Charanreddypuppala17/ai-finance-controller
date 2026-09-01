import { ErpRecord, PaymentRecord, BankRecord } from './types';

export function parseCleanAmount(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
}

export function parseCleanDate(val: string): string {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toISOString().split('T')[0];
}

export function calculateDateDiffDays(date1Str?: string, date2Str?: string): number {
  if (!date1Str || !date2Str) return 0;
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function normalizeErpRecord(rec: ErpRecord): ErpRecord {
  return {
    ...rec,
    invoice_id: rec.invoice_id.trim().toUpperCase(),
    customer_id: rec.customer_id.trim().toUpperCase(),
    amount: Math.round(parseCleanAmount(rec.amount) * 100) / 100,
    invoice_date: parseCleanDate(rec.invoice_date),
  };
}

export function normalizePaymentRecord(rec: PaymentRecord): PaymentRecord {
  return {
    ...rec,
    payment_id: rec.payment_id.trim().toUpperCase(),
    invoice_id: rec.invoice_id.trim().toUpperCase(),
    amount: Math.round(parseCleanAmount(rec.amount) * 100) / 100,
    fee: Math.round(parseCleanAmount(rec.fee) * 100) / 100,
    payment_date: parseCleanDate(rec.payment_date),
  };
}

export function normalizeBankRecord(rec: BankRecord): BankRecord {
  return {
    ...rec,
    settlement_id: rec.settlement_id.trim().toUpperCase(),
    payment_id: rec.payment_id.trim().toUpperCase(),
    amount: Math.round(parseCleanAmount(rec.amount) * 100) / 100,
    settlement_date: parseCleanDate(rec.settlement_date),
  };
}
