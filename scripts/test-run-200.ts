import { reconcileDatasets } from '../reconciliation/reconcile';

const erpCsv = `invoice_id,amount,invoice_date,customer_id
INV-10001,18500,2026-08-20,CUST-1
INV-10002,75000,2026-08-08,CUST-2`;

const payCsv = `payment_id,invoice_id,amount,payment_date,fee
GTW-900000,INV-10001,18500,2026-08-21,0
GTW-900001,INV-10002,75000,2026-08-09,0`;

const bankCsv = `settlement_id,payment_id,credit_amount,settlement_date
UTR0820000000,GTW-900000,18500,2026-08-22
UTR0808000001,GTW-900001,75000,2026-08-11`;

const output = reconcileDatasets(erpCsv, payCsv, bankCsv);
console.log('Summary:', JSON.stringify(output.summary, null, 2));
console.log('Transactions:', JSON.stringify(output.transactions.map(t => ({
  id: t.transaction_id,
  inv: t.source_record_ids.invoice_id,
  pay: t.source_record_ids.payment_id,
  set: t.source_record_ids.settlement_id,
  status: t.status,
  erpAmt: t.erp_amount,
  payAmt: t.payment_amount,
  bankAmt: t.bank_amount,
  method: t.matching_method
})), null, 2));
