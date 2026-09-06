import { erpCsv, payCsv, bankCsv } from './run_user_dataset';
import Papa from 'papaparse';

const erpRows = Papa.parse(erpCsv.trim(), { header: true }).data as any[];
const payRows = Papa.parse(payCsv.trim(), { header: true }).data as any[];
const bankRows = Papa.parse(bankCsv.trim(), { header: true }).data as any[];

console.log('ERP count:', erpRows.length);
console.log('PAY count:', payRows.length);
console.log('BANK count:', bankRows.length);

interface RowComparison {
  index: number;
  invId: string;
  orderIdErp: string;
  gtwTxnId: string;
  orderRefPay: string;
  bankTxnId: string;
  bankRef: string;
  utr: string;
  narration: string;
  erpAmt: number;
  payAmt: number;
  fee: number;
  netPay: number;
  bankAmt: number;
  issues: string[];
}

const comparisons: RowComparison[] = [];

for (let i = 0; i < 200; i++) {
  const erp = erpRows[i] || {};
  const pay = payRows[i] || {};
  const bank = bankRows[i] || {};

  const erpAmt = parseFloat(erp.invoice_amount || '0');
  const payAmt = parseFloat(pay.transaction_amount || '0');
  const fee = parseFloat(pay.gateway_fee || '0');
  const netPay = parseFloat(pay.net_settlement_amount || '0');
  const bankAmt = parseFloat(bank.credit_amount || '0');

  const issues: string[] = [];

  // Check 1: Order Ref
  if (erp.order_id !== pay.order_reference) {
    issues.push(`Order ID mismatch: ERP(${erp.order_id}) vs PAY(${pay.order_reference})`);
  }

  // Check 2: Gateway ID in Bank
  if (bank.reference_id !== pay.gateway_txn_id) {
    issues.push(`Bank Reference mismatch: PAY(${pay.gateway_txn_id}) vs BANK(${bank.reference_id})`);
  }

  // Check 3: ERP vs Pay Amount
  if (Math.abs(erpAmt - payAmt) > 0.01) {
    issues.push(`Amount mismatch: ERP(₹${erpAmt}) vs PAY(₹${payAmt}) [diff: ₹${erpAmt - payAmt}]`);
  }

  // Check 4: Net Pay vs Bank Amount
  if (Math.abs(netPay - bankAmt) > 0.01) {
    issues.push(`Settlement variance: NetPay(₹${netPay}) vs Bank(₹${bankAmt}) [fee: ₹${fee}, diff: ₹${payAmt - bankAmt}]`);
  }

  comparisons.push({
    index: i,
    invId: erp.invoice_id,
    orderIdErp: erp.order_id,
    gtwTxnId: pay.gateway_txn_id,
    orderRefPay: pay.order_reference,
    bankTxnId: bank.bank_txn_id,
    bankRef: bank.reference_id,
    utr: bank.utr_number,
    narration: bank.narration,
    erpAmt,
    payAmt,
    fee,
    netPay,
    bankAmt,
    issues,
  });
}

const withIssues = comparisons.filter(c => c.issues.length > 0);
const withoutIssues = comparisons.filter(c => c.issues.length === 0);

console.log(`\n=== EXACT GROUND-TRUTH ANALYSIS OF 200 TRANSACTIONS ===`);
console.log(`Total Transactions: ${comparisons.length}`);
console.log(`Perfect Transactions (0 Issues): ${withoutIssues.length}`);
console.log(`Transactions With Exceptions / Anomalies: ${withIssues.length}`);

console.log(`\nDetailed Breakdown of ALL ${withIssues.length} Exceptional Transactions:\n`);
withIssues.forEach((c, idx) => {
  console.log(`${idx + 1}. [Row ${c.index + 1}] Invoice: ${c.invId} | Order: ${c.orderIdErp} | Pay: ${c.gtwTxnId} | Bank: ${c.utr}`);
  console.log(`   ERP Amt: ₹${c.erpAmt} | Pay Amt: ₹${c.payAmt} (Fee: ₹${c.fee}) | Bank Amt: ₹${c.bankAmt}`);
  console.log(`   Issues: ${c.issues.join('; ')}`);
});
