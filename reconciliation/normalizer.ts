import { ErpRecord, PaymentRecord, BankRecord } from './types';

export function parseCleanAmount(val: any): number {
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  if (!val) return 0;
  
  let str = String(val).trim();
  // Handle parenthesis notation for negative amounts: "(100.50)" -> "-100.50"
  if (str.startsWith('(') && str.endsWith(')')) {
    str = '-' + str.slice(1, -1);
  }
  // Strip currency symbols (₹, $, €, £, ¥), spaces, commas
  const cleaned = str.replace(/[₹$€£¥,\s]/g, '').replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function parseCleanDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? new Date().toISOString().split('T')[0] : val.toISOString().split('T')[0];
  }
  
  const str = String(val).trim();
  if (!str) return new Date().toISOString().split('T')[0];

  // Check if it's DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    const yr = parseInt(dmyMatch[3], 10);
    // If first part > 12, it must be day
    if (p1 > 12 && p2 <= 12) {
      const d = new Date(yr, p2 - 1, p1);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  // If timestamp in seconds / ms
  const num = Number(str);
  if (!isNaN(num) && num > 100000000) {
    const tsDate = new Date(num > 10000000000 ? num : num * 1000);
    if (!isNaN(tsDate.getTime())) return tsDate.toISOString().split('T')[0];
  }

  return str.split(' ')[0] || new Date().toISOString().split('T')[0];
}

export function extractCoreIdentifier(id?: string): string {
  if (!id) return '';
  let clean = String(id).trim().toUpperCase();
  
  // Remove trailing duplicate indicators (e.g., -DUP, -B, -COPY, -DUP2)
  clean = clean.replace(/[-_:]+(DUP\d*|COPY\d*|B)$/i, '');
  clean = clean.replace(/^[#\s]+/, '');

  let prev = '';
  while (clean !== prev) {
    prev = clean;
    clean = clean.replace(/^(ERP|GW|BNK|BANK|SET|INV|PAY|TXN|ORDER|ORD|BILL|DOC|VOUCHER|CHALLAN|CR|DR|DEP|TR|RF)[-_:\s]*/i, '');
  }

  return clean || String(id).trim().toUpperCase();
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
  const invId = (rec.invoice_id || '').trim().toUpperCase();
  return {
    ...rec,
    invoice_id: invId,
    customer_id: (rec.customer_id || 'UNKNOWN').trim().toUpperCase(),
    amount: Math.round(parseCleanAmount(rec.amount) * 100) / 100,
    invoice_date: parseCleanDate(rec.invoice_date),
    status: (rec.status || 'POSTED').trim().toUpperCase(),
  };
}

export function normalizePaymentRecord(rec: PaymentRecord): PaymentRecord {
  const payId = (rec.payment_id || '').trim().toUpperCase();
  const invId = (rec.invoice_id || payId).trim().toUpperCase();
  return {
    ...rec,
    payment_id: payId,
    invoice_id: invId,
    amount: Math.round(parseCleanAmount(rec.amount) * 100) / 100,
    fee: Math.round(parseCleanAmount(rec.fee) * 100) / 100,
    payment_date: parseCleanDate(rec.payment_date),
    status: (rec.status || 'SUCCESS').trim().toUpperCase(),
  };
}

export function normalizeBankRecord(rec: BankRecord): BankRecord {
  const setId = (rec.settlement_id || '').trim().toUpperCase();
  const payId = (rec.payment_id || setId).trim().toUpperCase();
  const rawAmount = rec.amount || (rec.raw ? rec.raw['bank_amount'] || rec.raw['credit_amount'] || rec.raw['deposit_amount'] || rec.raw['deposit'] || rec.raw['credit'] : 0);
  const narration = rec.narration || rec.description || (rec.raw ? rec.raw['narration'] || rec.raw['description'] || rec.raw['particulars'] || rec.raw['remarks'] : '') || '';

  return {
    ...rec,
    settlement_id: setId,
    payment_id: payId,
    amount: Math.round(parseCleanAmount(rawAmount) * 100) / 100,
    settlement_date: parseCleanDate(rec.settlement_date),
    status: (rec.status || 'SETTLED').trim().toUpperCase(),
    narration: String(narration).trim(),
    description: String(narration).trim(),
  };
}
