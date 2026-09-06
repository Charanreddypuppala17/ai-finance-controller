import fs from 'fs';
import { reconcileDatasets } from '../reconciliation/reconcile';

async function main() {
  if (!fs.existsSync('debug-uploads/debug-erp.csv')) {
    console.log('No debug-erp.csv found');
    return;
  }
  const erpCsv = fs.readFileSync('debug-uploads/debug-erp.csv', 'utf8');
  const payCsv = fs.readFileSync('debug-uploads/debug-payment.csv', 'utf8');
  const bankCsv = fs.readFileSync('debug-uploads/debug-bank.csv', 'utf8');

  console.log('ERP lines:', erpCsv.split('\n').filter(Boolean).length);
  console.log('PAY lines:', payCsv.split('\n').filter(Boolean).length);
  console.log('BANK lines:', bankCsv.split('\n').filter(Boolean).length);

  const out = reconcileDatasets(erpCsv, payCsv, bankCsv);
  console.log('Summary:', out.summary);
  console.log('Sample matched:', out.transactions.filter(t => t.status === 'MATCHED').slice(0, 2));
  console.log('Sample exceptions:', out.transactions.filter(t => t.status === 'EXCEPTION').slice(0, 5));
}

main().catch(console.error);
