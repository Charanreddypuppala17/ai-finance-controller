const fs = require('fs');
const path = require('path');

async function triggerLiveRun() {
  try {
    const erpCsv = fs.readFileSync(path.join(__dirname, '../debug-uploads/debug-erp.csv'), 'utf8');
    const paymentCsv = fs.readFileSync(path.join(__dirname, '../debug-uploads/debug-payment.csv'), 'utf8');
    const bankCsv = fs.readFileSync(path.join(__dirname, '../debug-uploads/debug-bank.csv'), 'utf8');

    console.log('Sending live POST to http://localhost:3000/api/reconcile ...');
    const res = await fetch('http://localhost:3000/api/reconcile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'demo-user-001'
      },
      body: JSON.stringify({
        erpCsv,
        paymentCsv,
        bankCsv,
        runName: 'Live Verified Multi-Source Run (Upgraded Engine)',
        options: { dateToleranceDays: 3 }
      })
    });

    const data = await res.json();
    console.log('Response Status:', res.status);
    console.log('Result Data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to trigger live run:', err);
  }
}

// Wait 2 seconds for server to be fully ready, then execute
setTimeout(triggerLiveRun, 2000);
