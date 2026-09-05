const fs = require('fs');
const path = require('path');
const { reconcileDatasets } = require('../reconciliation/reconcile');

async function testDebugFiles() {
  try {
    const erp = fs.readFileSync(path.join(__dirname, '../debug-uploads/debug-erp.csv'), 'utf8');
    const pay = fs.readFileSync(path.join(__dirname, '../debug-uploads/debug-payment.csv'), 'utf8');
    const bank = fs.readFileSync(path.join(__dirname, '../debug-uploads/debug-bank.csv'), 'utf8');

    console.log('Running reconciliation on debug-uploads files...');
    const output = reconcileDatasets(erp, pay, bank);
    console.log('\n--- Output Summary ---');
    console.log(JSON.stringify(output.summary, null, 2));

    const matched = output.transactions.filter(t => t.status === 'MATCHED');
    const exceptions = output.transactions.filter(t => t.status === 'EXCEPTION');
    console.log(`\nMatched count: ${matched.length}`);
    console.log(`Exceptions count: ${exceptions.length}`);

    if (exceptions.length > 0) {
      console.log('\nSample Exceptions:');
      exceptions.slice(0, 5).forEach((t, i) => {
        console.log(`[${i+1}] ID: ${t.transaction_id} | Type: ${t.exception_type} | Method: ${t.matching_method} | ERP: ${t.erp_amount} | PAY: ${t.payment_amount} | BNK: ${t.bank_amount} | Diff: ${t.difference}`);
        console.log(`Summary: ${t.evidence.summary}\n`);
      });
    }

    if (matched.length > 0) {
      console.log('Sample Matched:');
      matched.slice(0, 3).forEach((t, i) => {
        console.log(`[${i+1}] ID: ${t.transaction_id} | Status: ${t.status} | ERP: ${t.erp_amount} | PAY: ${t.payment_amount} | BNK: ${t.bank_amount}`);
      });
    }
  } catch (err) {
    console.error('Error running test on debug files:', err);
  }
}

testDebugFiles();
