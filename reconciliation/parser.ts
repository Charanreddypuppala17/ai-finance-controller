import Papa from 'papaparse';
import { SourceType } from './types';

export interface ParsedCsvResult<T = Record<string, any>> {
  data: T[];
  headers: string[];
  detectedType: SourceType;
  errors: string[];
}

export function cleanHeaderKey(key: string): string {
  if (!key) return '';
  return key
    .replace(/^[\uFEFF\u200B\u00A0\s"'`]+|[\u200B\u00A0\s"'`]+$/g, '')
    .trim()
    .toLowerCase()
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
    .replace(/[^a-z0-9]+/g, '_');
}

export function detectSourceType(headers: string[]): SourceType {
  const cleaned = headers.map(cleanHeaderKey);
  let erpScore = 0;
  let payScore = 0;
  let bankScore = 0;

  for (const h of cleaned) {
    // High-confidence exact matches
    if (['invoice_id', 'invoice_no', 'customer_id', 'erp_reference', 'billed_amount', 'bill_no', 'invoice_date', 'customer_name', 'order_id', 'voucher_no', 'challan_no', 'doc_no'].includes(h)) erpScore += 4;
    if (['fee', 'gateway_fee', 'gateway_reference', 'gateway_id', 'charge_id', 'captured', 'payment_status', 'payment_date', 'processing_fee', 'commission', 'mdr', 'auth_code'].includes(h)) payScore += 4;
    if (['settlement_id', 'settlement_date', 'bank_reference', 'credit_amount', 'value_date', 'utr', 'rrn', 'payout_id', 'transaction_type', 'statement_id', 'narration', 'deposit', 'withdrawal', 'balance'].includes(h)) bankScore += 4;

    // Keyword inclusions
    if (h.includes('invoice') || h.includes('cust') || h.includes('bill') || h.includes('order') || h.includes('voucher') || h.includes('challan') || h.includes('receivable')) erpScore += 1;
    if (h.includes('gateway') || h.includes('pay') || h.includes('fee') || h.includes('charge') || h.includes('captured') || h.includes('stripe') || h.includes('razorpay')) payScore += 1;
    if (h.includes('bank') || h.includes('settle') || h.includes('payout') || h.includes('credit') || h.includes('debit') || h.includes('utr') || h.includes('rrn') || h.includes('statement') || h.includes('narrat') || h.includes('deposit')) bankScore += 1;
  }

  if (bankScore > payScore && bankScore > erpScore) return 'BANK';
  if (payScore > erpScore && payScore >= bankScore) return 'PAYMENT';
  return 'ERP';
}

export function normalizeRowKeys(row: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(row)) {
    const normKey = cleanHeaderKey(key);
    if (normKey) {
      normalized[normKey] = value;
    }
    normalized[key] = value;
  }

  // 1. Universal Amount mapping
  if (!normalized['amount']) {
    const fallback =
      normalized['amount'] ??
      normalized['transaction_amount'] ??
      normalized['txn_amount'] ??
      normalized['trans_amount'] ??
      normalized['invoice_amount'] ??
      normalized['inv_amount'] ??
      normalized['invoice_amt'] ??
      normalized['payment_amount'] ??
      normalized['pay_amount'] ??
      normalized['captured_amount'] ??
      normalized['credit_amount'] ??
      normalized['credit_amt'] ??
      normalized['credit'] ??
      normalized['deposit_amount'] ??
      normalized['deposit_amt'] ??
      normalized['deposit'] ??
      normalized['settlement_amount'] ??
      normalized['payout_amount'] ??
      normalized['total_amount'] ??
      normalized['total_amt'] ??
      normalized['total'] ??
      normalized['gross_amount'] ??
      normalized['gross_amt'] ??
      normalized['gross'] ??
      normalized['billed_amount'] ??
      normalized['billed_amt'] ??
      normalized['net_amount'] ??
      normalized['net_amt'] ??
      normalized['price'] ??
      normalized['val'] ??
      normalized['value'];
    if (fallback !== undefined) normalized['amount'] = fallback;
  }

  // 2. ERP mappings
  if (!normalized['invoice_id']) {
    const fallback =
      normalized['invoice_id'] ??
      normalized['inv_id'] ??
      normalized['invoice_no'] ??
      normalized['invoiceno'] ??
      normalized['invoice_number'] ??
      normalized['invoice_num'] ??
      normalized['invoice'] ??
      normalized['inv'] ??
      normalized['inv_no'] ??
      normalized['bill_no'] ??
      normalized['bill_number'] ??
      normalized['bill_id'] ??
      normalized['bill'] ??
      normalized['order_id'] ??
      normalized['orderno'] ??
      normalized['order_number'] ??
      normalized['order_no'] ??
      normalized['order'] ??
      normalized['order_reference'] ??
      normalized['order_ref'] ??
      normalized['ord_id'] ??
      normalized['ord_no'] ??
      normalized['transaction_id'] ??
      normalized['txn_id'] ??
      normalized['txnid'] ??
      normalized['txn_no'] ??
      normalized['txn'] ??
      normalized['erp_reference'] ??
      normalized['erp_ref'] ??
      normalized['reference_id'] ??
      normalized['ref_id'] ??
      normalized['ref_no'] ??
      normalized['reference_no'] ??
      normalized['reference'] ??
      normalized['ref'] ??
      normalized['doc_no'] ??
      normalized['doc_number'] ??
      normalized['doc_id'] ??
      normalized['voucher_no'] ??
      normalized['voucher_number'] ??
      normalized['voucher_id'] ??
      normalized['challan_no'] ??
      normalized['id'];
    if (fallback !== undefined) normalized['invoice_id'] = String(fallback).trim();
  }

  if (!normalized['customer_id']) {
    const fallback =
      normalized['customer_id'] ??
      normalized['customer_no'] ??
      normalized['customerno'] ??
      normalized['customer_code'] ??
      normalized['customer_name'] ??
      normalized['customer'] ??
      normalized['cust_id'] ??
      normalized['cust_no'] ??
      normalized['cust_name'] ??
      normalized['cust'] ??
      normalized['client_id'] ??
      normalized['client_name'] ??
      normalized['client'] ??
      normalized['account_id'] ??
      normalized['account_no'] ??
      normalized['account_name'] ??
      normalized['account'] ??
      normalized['user_id'] ??
      normalized['payer_id'] ??
      normalized['payer_name'] ??
      normalized['party_name'] ??
      normalized['party_id'];
    if (fallback !== undefined) normalized['customer_id'] = String(fallback).trim();
  }

  if (!normalized['invoice_date']) {
    const fallback =
      normalized['invoice_date'] ??
      normalized['inv_date'] ??
      normalized['bill_date'] ??
      normalized['order_date'] ??
      normalized['doc_date'] ??
      normalized['transaction_date'] ??
      normalized['txn_date'] ??
      normalized['tx_date'] ??
      normalized['posting_date'] ??
      normalized['posted_date'] ??
      normalized['date'] ??
      normalized['created_at'] ??
      normalized['created_date'] ??
      normalized['timestamp'] ??
      normalized['datetime'] ??
      normalized['time'];
    if (fallback !== undefined) normalized['invoice_date'] = String(fallback).trim();
  }

  if (!normalized['status']) {
    const fallback =
      normalized['status'] ??
      normalized['payment_status'] ??
      normalized['invoice_status'] ??
      normalized['state'] ??
      normalized['record_status'] ??
      normalized['doc_status'];
    if (fallback !== undefined) normalized['status'] = String(fallback).trim();
  }

  // 3. Payment mappings
  if (!normalized['payment_id']) {
    const fallback =
      normalized['payment_id'] ??
      normalized['gateway_txn_id'] ??
      normalized['gateway_txnid'] ??
      normalized['gateway_transaction_id'] ??
      normalized['gateway_trans_id'] ??
      normalized['gtw_txn_id'] ??
      normalized['pay_id'] ??
      normalized['paymentid'] ??
      normalized['payment_number'] ??
      normalized['payment_no'] ??
      normalized['paymentno'] ??
      normalized['payment'] ??
      normalized['gateway_reference'] ??
      normalized['gateway_ref'] ??
      normalized['gateway_id'] ??
      normalized['gw_ref'] ??
      normalized['gw_id'] ??
      normalized['charge_id'] ??
      normalized['ch_id'] ??
      normalized['payment_reference'] ??
      normalized['payment_ref'] ??
      normalized['reference_id'] ??
      normalized['ref_id'] ??
      normalized['ref_no'] ??
      normalized['reference_no'] ??
      normalized['reference'] ??
      normalized['ref'] ??
      normalized['transaction_id'] ??
      normalized['txn_id'] ??
      normalized['txnid'] ??
      normalized['txn_no'] ??
      normalized['txn'] ??
      normalized['order_id'] ??
      normalized['orderid'] ??
      normalized['order_no'] ??
      normalized['orderno'] ??
      normalized['id'];
    if (fallback !== undefined) normalized['payment_id'] = String(fallback).trim();
  }

  if (!normalized['invoice_id']) {
    const fallback =
      normalized['invoice_id'] ??
      normalized['inv_id'] ??
      normalized['invoice_no'] ??
      normalized['invoiceno'] ??
      normalized['invoice_number'] ??
      normalized['order_reference'] ??
      normalized['order_ref'] ??
      normalized['order_id'] ??
      normalized['orderid'] ??
      normalized['order_no'] ??
      normalized['orderno'] ??
      normalized['order_number'] ??
      normalized['order'] ??
      normalized['bill_no'] ??
      normalized['bill_id'] ??
      normalized['reference_id'] ??
      normalized['ref_id'] ??
      normalized['reference_no'] ??
      normalized['ref_no'] ??
      normalized['reference'] ??
      normalized['erp_reference'] ??
      normalized['erp_ref'] ??
      normalized['doc_no'] ??
      normalized['voucher_no'];
    if (fallback !== undefined) normalized['invoice_id'] = String(fallback).trim();
  }

  if (!normalized['payment_date']) {
    const fallback =
      normalized['payment_date'] ??
      normalized['pay_date'] ??
      normalized['transaction_date'] ??
      normalized['txn_date'] ??
      normalized['tx_date'] ??
      normalized['payment_time'] ??
      normalized['created_at'] ??
      normalized['captured_at'] ??
      normalized['timestamp'] ??
      normalized['date'] ??
      normalized['datetime'] ??
      normalized['time'];
    if (fallback !== undefined) normalized['payment_date'] = String(fallback).trim();
  }

  if (!normalized['fee']) {
    const fallback =
      normalized['fee'] ??
      normalized['gateway_fee'] ??
      normalized['gw_fee'] ??
      normalized['charge'] ??
      normalized['charges'] ??
      normalized['charge_amount'] ??
      normalized['processing_fee'] ??
      normalized['commission'] ??
      normalized['commission_amount'] ??
      normalized['mdr'] ??
      normalized['fee_amount'] ??
      normalized['fees'] ??
      normalized['tax'] ??
      normalized['service_tax'] ??
      normalized['gst'] ??
      normalized['deduction'] ??
      normalized['deductions'] ??
      normalized['gateway_charge'] ??
      normalized['pg_fee'] ??
      normalized['convenience_fee'] ??
      normalized['service_fee'] ??
      normalized['merchant_fee'];
    if (fallback !== undefined) normalized['fee'] = fallback;
  }

  // 4. Bank mappings
  if (!normalized['settlement_id']) {
    const fallback =
      normalized['settlement_id'] ??
      normalized['settlement_no'] ??
      normalized['settlementno'] ??
      normalized['settlement_number'] ??
      normalized['bank_txn_id'] ??
      normalized['bank_txnid'] ??
      normalized['bank_transaction_id'] ??
      normalized['utr_number'] ??
      normalized['utr_no'] ??
      normalized['utr'] ??
      normalized['rrn_no'] ??
      normalized['rrn'] ??
      normalized['bank_reference'] ??
      normalized['bank_ref'] ??
      normalized['payout_id'] ??
      normalized['payout_no'] ??
      normalized['payout_reference'] ??
      normalized['journal_id'] ??
      normalized['journal_no'] ??
      normalized['statement_id'] ??
      normalized['statement_no'] ??
      normalized['ref_no'] ??
      normalized['reference_no'] ??
      normalized['reference_number'] ??
      normalized['reference_id'] ??
      normalized['ref_id'] ??
      normalized['reference'] ??
      normalized['ref'] ??
      normalized['transaction_id'] ??
      normalized['txn_id'] ??
      normalized['txnid'] ??
      normalized['txn_no'] ??
      normalized['id'];
    if (fallback !== undefined) normalized['settlement_id'] = String(fallback).trim();
  }

  if (!normalized['payment_id']) {
    const fallback =
      normalized['payment_id'] ??
      normalized['pay_id'] ??
      normalized['paymentid'] ??
      normalized['reference_id'] ??
      normalized['ref_id'] ??
      normalized['reference_no'] ??
      normalized['ref_no'] ??
      normalized['reference'] ??
      normalized['ref'] ??
      normalized['gateway_txn_id'] ??
      normalized['gtw_txn_id'] ??
      normalized['gateway_reference'] ??
      normalized['gateway_ref'] ??
      normalized['payment_reference'] ??
      normalized['payment_ref'] ??
      normalized['order_reference'] ??
      normalized['order_ref'] ??
      normalized['order_id'] ??
      normalized['orderid'] ??
      normalized['order_no'] ??
      normalized['invoice_id'] ??
      normalized['inv_id'] ??
      normalized['invoice_no'] ??
      normalized['bank_reference'] ??
      normalized['bank_ref'] ??
      normalized['transaction_id'] ??
      normalized['txn_id'] ??
      normalized['txnid'] ??
      normalized['narration'] ??
      normalized['description'] ??
      normalized['remarks'] ??
      normalized['details'] ??
      normalized['particulars'] ??
      normalized['memo'];
    if (fallback !== undefined) normalized['payment_id'] = String(fallback).trim();
  }

  if (!normalized['settlement_date']) {
    const fallback =
      normalized['settlement_date'] ??
      normalized['payout_date'] ??
      normalized['value_date'] ??
      normalized['val_date'] ??
      normalized['booking_date'] ??
      normalized['posting_date'] ??
      normalized['posted_date'] ??
      normalized['clearing_date'] ??
      normalized['statement_date'] ??
      normalized['transaction_date'] ??
      normalized['txn_date'] ??
      normalized['tx_date'] ??
      normalized['created_at'] ??
      normalized['timestamp'] ??
      normalized['date'] ??
      normalized['datetime'] ??
      normalized['time'];
    if (fallback !== undefined) normalized['settlement_date'] = String(fallback).trim();
  }

  // Bank amounts: Prioritize Credit / Deposit / Settlement Amount / Net Amount
  const bankAmountFallback =
    normalized['credit_amount'] ??
    normalized['credit_amt'] ??
    normalized['credit'] ??
    normalized['deposit_amount'] ??
    normalized['deposit_amt'] ??
    normalized['deposit'] ??
    normalized['settlement_amount'] ??
    normalized['payout_amount'] ??
    normalized['net_amount'] ??
    normalized['net_amt'] ??
    normalized['amount'];
  if (bankAmountFallback !== undefined) {
    normalized['bank_amount'] = bankAmountFallback;
  }

  // Preserve Narration & Description
  const narrationFallback =
    normalized['narration'] ??
    normalized['particulars'] ??
    normalized['description'] ??
    normalized['remarks'] ??
    normalized['details'] ??
    normalized['memo'] ??
    normalized['statement_description'] ??
    normalized['bank_reference'];
  if (narrationFallback !== undefined) {
    normalized['narration'] = String(narrationFallback).trim();
    normalized['description'] = String(narrationFallback).trim();
  }

  return normalized;
}

export function parseCsvString<T = Record<string, any>>(csvContent: string): ParsedCsvResult<T> {
  // Strip UTF-8 BOM, zero-width spaces, and leading/trailing quotes/whitespace
  const cleanedContent = (csvContent || '')
    .replace(/^[\uFEFF\u200B\u00A0\s]+/, '')
    .trim();

  if (!cleanedContent) {
    return {
      data: [],
      headers: [],
      detectedType: 'ERP',
      errors: ['Empty CSV content'],
    };
  }

  const result = Papa.parse<Record<string, any>>(cleanedContent, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
    transformHeader: (header: string) => cleanHeaderKey(header),
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
