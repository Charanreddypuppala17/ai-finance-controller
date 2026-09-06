import { parseCsvString, normalizeRowKeys } from '../reconciliation/parser';

const payRow = {
  gateway_txn_id: 'GTW-900000',
  order_reference: 'ORD-70000',
  merchant_name: 'AcmeTechnologies',
  transaction_amount: '18500',
  currency: 'INR',
  transaction_date: '2026-08-20',
  gateway_fee: '277.5',
  net_settlement_amount: '18222.5',
  payment_status: 'SUCCESS'
};

const erpRow = {
  invoice_id: 'INV-10001',
  order_id: 'ORD-70000',
  customer_name: 'Acme Technologies',
  invoice_amount: '18500',
  currency: 'INR',
  invoice_date: '2026-08-20',
  due_date: '2026-08-27',
  status: 'PAID'
};

const bankRow = {
  bank_txn_id: 'BANK-800000',
  utr_number: 'UTR0820000000',
  narration: 'ACME TECHNOLOGIES',
  reference_id: 'GTW-900000',
  credit_amount: '18222.5',
  currency: 'INR',
  transaction_date: '2026-08-22',
  bank_account: 'HDFC-REVALTO-001',
  transaction_type: 'CREDIT'
};

console.log('Normalized ERP:', normalizeRowKeys(erpRow));
console.log('\nNormalized Pay:', normalizeRowKeys(payRow));
console.log('\nNormalized Bank:', normalizeRowKeys(bankRow));
