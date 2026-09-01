const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { parseCsvString } = require('../reconciliation/parser');
const { validateErpRecords, validatePaymentRecords, validateBankRecords } = require('../reconciliation/validator');

const erpPath = path.join(__dirname, '../debug-uploads/debug-erp.csv');
const payPath = path.join(__dirname, '../debug-uploads/debug-payment.csv');
const bankPath = path.join(__dirname, '../debug-uploads/debug-bank.csv');

try {
  const erpCsv = fs.readFileSync(erpPath, 'utf8');
  const payCsv = fs.readFileSync(payPath, 'utf8');
  const bankCsv = fs.readFileSync(bankPath, 'utf8');

  const parsedErp = parseCsvString(erpCsv);
  const parsedPay = parseCsvString(payCsv);
  const parsedBank = parseCsvString(bankCsv);

  console.log('--- ERP parsed rows:', parsedErp.data.length);
  console.log('--- Payment parsed rows:', parsedPay.data.length);
  console.log('--- Bank parsed rows:', parsedBank.data.length);

  const validErp = validateErpRecords(parsedErp.data);
  const validPay = validatePaymentRecords(parsedPay.data);
  const validBank = validateBankRecords(parsedBank.data);

  console.log('\n--- ERP Validator ---');
  console.log('Valid:', validErp.valid.length);
  console.log('Invalid:', validErp.invalid.length);
  if (validErp.invalid.length > 0) {
    console.log('Sample ERP errors:', JSON.stringify(validErp.invalid[0].errors, null, 2));
    console.log('Sample ERP row:', validErp.invalid[0].row);
  }

  console.log('\n--- Payment Validator ---');
  console.log('Valid:', validPay.valid.length);
  console.log('Invalid:', validPay.invalid.length);
  if (validPay.invalid.length > 0) {
    console.log('Sample Payment errors:', JSON.stringify(validPay.invalid[0].errors, null, 2));
    console.log('Sample Payment row:', validPay.invalid[0].row);
  }

  console.log('\n--- Bank Validator ---');
  console.log('Valid:', validBank.valid.length);
  console.log('Invalid:', validBank.invalid.length);
  if (validBank.invalid.length > 0) {
    console.log('Sample Bank errors:', JSON.stringify(validBank.invalid[0].errors, null, 2));
    console.log('Sample Bank row:', validBank.invalid[0].row);
  }

} catch (err) {
  console.error('Error running test script:', err);
}
