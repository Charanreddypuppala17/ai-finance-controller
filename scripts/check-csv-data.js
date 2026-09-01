const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const erpPath = path.join(__dirname, '../debug-uploads/debug-erp.csv');
const payPath = path.join(__dirname, '../debug-uploads/debug-payment.csv');
const bankPath = path.join(__dirname, '../debug-uploads/debug-bank.csv');

function checkCsv(filePath, name) {
  const content = fs.readFileSync(filePath, 'utf8');
  const result = Papa.parse(content, { header: true, skipEmptyLines: true });
  console.log(`\n--- ${name} CSV ---`);
  console.log('Total Rows:', result.data.length);
  console.log('Columns:', result.meta.fields);
  console.log('First Row sample:', result.data[0]);

  // Find duplicate keys
  const idCounts = {};
  result.data.forEach(row => {
    let key;
    if (name === 'ERP') key = row.invoice_id;
    else if (name === 'Payment') key = row.invoice_id; // Check duplicate invoice_ids in payments
    else if (name === 'Bank') key = row.payment_id;

    if (key) {
      idCounts[key] = (idCounts[key] || 0) + 1;
    }
  });

  const duplicates = Object.entries(idCounts).filter(([_, count]) => count > 1);
  console.log(`Duplicate keys (count > 1):`, duplicates.length, 'duplicates found.');
  if (duplicates.length > 0) {
    console.log('Sample duplicates:', duplicates.slice(0, 5));
  }
}

try {
  checkCsv(erpPath, 'ERP');
  checkCsv(payPath, 'Payment');
  checkCsv(bankPath, 'Bank');
} catch (err) {
  console.error('Error reading files:', err);
}
