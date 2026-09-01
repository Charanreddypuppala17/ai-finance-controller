import Papa from 'papaparse';
import { SourceType } from './types';

export interface ParsedCsvResult<T = Record<string, any>> {
  data: T[];
  headers: string[];
  detectedType: SourceType;
  errors: string[];
}

export function detectSourceType(headers: string[]): SourceType {
  const normalized = headers.map(h => h.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_'));
  
  if (normalized.includes('invoice_id') || normalized.includes('invoice_number') || normalized.includes('customer_id')) {
    return 'ERP';
  }
  if (normalized.includes('payment_id') || normalized.includes('fee') || normalized.includes('gateway_id')) {
    return 'PAYMENT';
  }
  if (normalized.includes('settlement_id') || normalized.includes('bank_ref') || normalized.includes('payout_id')) {
    return 'BANK';
  }

  return 'ERP';
}

export function normalizeRowKeys(row: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(row)) {
    const normKey = key.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
    normalized[normKey] = value;
    normalized[key] = value;
  }

  // ERP mappings
  if (!normalized['invoice_id']) {
    const fallback = normalized['invoice_id'] ?? normalized['transaction_id'] ?? normalized['invoice_number'] ?? normalized['invoice_no'] ?? normalized['invoiceno'] ?? normalized['erp_reference'];
    if (fallback !== undefined) normalized['invoice_id'] = fallback;
  }
  if (!normalized['customer_id']) {
    const fallback = normalized['customer_no'] ?? normalized['customerno'] ?? normalized['customer_id'];
    if (fallback !== undefined) normalized['customer_id'] = fallback;
  }
  if (!normalized['invoice_date']) {
    const fallback = normalized['invoice_date'] ?? normalized['transaction_date'] ?? normalized['date'];
    if (fallback !== undefined) normalized['invoice_date'] = fallback;
  }
  if (!normalized['amount']) {
    const fallback = normalized['amount'] ?? normalized['invoice_amount'] ?? normalized['invoice_amt'];
    if (fallback !== undefined) normalized['amount'] = fallback;
  }
  if (!normalized['status']) {
    const fallback = normalized['status'] ?? normalized['payment_status'] ?? normalized['invoice_status'];
    if (fallback !== undefined) normalized['status'] = fallback;
  }

  // Payment mappings
  if (!normalized['payment_id']) {
    const fallback = normalized['payment_id'] ?? normalized['transaction_id'] ?? normalized['payment_number'] ?? normalized['payment_no'] ?? normalized['paymentno'] ?? normalized['gateway_reference'];
    if (fallback !== undefined) normalized['payment_id'] = fallback;
  }
  if (!normalized['invoice_id']) {
    const fallback = normalized['invoice_id'] ?? normalized['transaction_id'] ?? normalized['invoice_reference'] ?? normalized['invoice_ref'];
    if (fallback !== undefined) normalized['invoice_id'] = fallback;
  }
  if (!normalized['payment_date']) {
    const fallback = normalized['payment_date'] ?? normalized['transaction_date'] ?? normalized['date'];
    if (fallback !== undefined) normalized['payment_date'] = fallback;
  }
  if (!normalized['fee']) {
    const fallback = normalized['fee'] ?? normalized['gateway_fee'] ?? normalized['charge'] ?? normalized['charges'];
    if (fallback !== undefined) normalized['fee'] = fallback;
  }
  if (!normalized['amount']) {
    const fallback = normalized['amount'] ?? normalized['payment_amount'] ?? normalized['payment_amt'];
    if (fallback !== undefined) normalized['amount'] = fallback;
  }
  if (!normalized['status']) {
    const fallback = normalized['status'] ?? normalized['payment_status'];
    if (fallback !== undefined) normalized['status'] = fallback;
  }

  // Bank mappings
  if (!normalized['settlement_id']) {
    const fallback = normalized['settlement_id'] ?? normalized['bank_reference'] ?? normalized['settlement_number'] ?? normalized['settlement_no'] ?? normalized['settlementno'] ?? normalized['payout_id'] ?? normalized['payout_no'] ?? normalized['transaction_id'];
    if (fallback !== undefined) normalized['settlement_id'] = fallback;
  }
  if (!normalized['payment_id']) {
    const fallback = normalized['payment_id'] ?? normalized['transaction_id'] ?? normalized['payment_reference'] ?? normalized['payment_ref'] ?? normalized['gateway_reference'];
    if (fallback !== undefined) normalized['payment_id'] = fallback;
  }
  if (!normalized['amount']) {
    const fallback = normalized['amount'] ?? normalized['credit_amount'] ?? normalized['settlement_amount'] ?? normalized['settlement_amt'] ?? normalized['net_amount'] ?? normalized['net_amt'];
    if (fallback !== undefined) normalized['amount'] = fallback;
  }
  if (!normalized['settlement_date']) {
    const fallback = normalized['settlement_date'] ?? normalized['transaction_date'] ?? normalized['value_date'] ?? normalized['date'];
    if (fallback !== undefined) normalized['settlement_date'] = fallback;
  }
  if (!normalized['status']) {
    const fallback = normalized['status'] ?? normalized['bank_status'] ?? normalized['settlement_status'];
    if (fallback !== undefined) normalized['status'] = fallback;
  }

  return normalized;
}

export function parseCsvString<T = Record<string, any>>(csvContent: string): ParsedCsvResult<T> {
  const result = Papa.parse<Record<string, any>>(csvContent.trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false, // Keep strings for precision parsing
  });

  const headers = result.meta.fields || [];
  const normalizedData = result.data.map(normalizeRowKeys) as unknown as T[];
  const detectedType = detectSourceType(headers);
  const errors = result.errors.map(e => `Line ${e.row}: ${e.message}`);

  return {
    data: normalizedData,
    headers,
    detectedType,
    errors,
  };
}
