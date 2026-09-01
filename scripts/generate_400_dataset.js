const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '../data/benchmark-400');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const erpRows = ['invoice_id,customer_id,amount,invoice_date,status'];
const paymentRows = ['payment_id,invoice_id,amount,payment_date,fee,status'];
const bankRows = ['settlement_id,payment_id,amount,settlement_date,status'];

const groundTruth = [];
const baseDate = new Date('2026-08-01');

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function addDays(d, days) {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}

for (let i = 1; i <= 400; i++) {
  const invId = `INV-${String(i).padStart(4, '0')}`;
  const custId = `CUST-${String(500 + (i % 50)).padStart(4, '0')}`;
  const invDate = formatDate(addDays(baseDate, (i % 20)));
  const payDate = formatDate(addDays(new Date(invDate), 1));
  const setDate = formatDate(addDays(new Date(payDate), 1)); // 1 day lag (T+1, normal)

  const erpAmount = 5000 + (i * 125.5);
  erpRows.push(`${invId},${custId},${erpAmount.toFixed(2)},${invDate},POSTED`);

  const payId = `PAY-${String(i).padStart(4, '0')}`;
  const setOptionId = `SET-${String(i).padStart(4, '0')}`;

  if (i <= 320) {
    // 1..320: Exact Matches (320 cases)
    paymentRows.push(`${payId},${invId},${erpAmount.toFixed(2)},${payDate},0.00,SUCCESS`);
    bankRows.push(`${setOptionId},${payId},${erpAmount.toFixed(2)},${setDate},SETTLED`);
    groundTruth.push({
      event_id: i,
      invoice_id: invId,
      payment_id: payId,
      settlement_id: setOptionId,
      expected_status: 'MATCHED',
      expected_exception_type: 'NONE',
    });
  } else if (i <= 345) {
    // 321..345: Fee Mismatch (25 cases)
    const fee = 50 + (i % 10) * 15;
    const bankAmt = erpAmount - fee;
    paymentRows.push(`${payId},${invId},${erpAmount.toFixed(2)},${payDate},${fee.toFixed(2)},SUCCESS`);
    bankRows.push(`${setOptionId},${payId},${bankAmt.toFixed(2)},${setDate},SETTLED`);
    groundTruth.push({
      event_id: i,
      invoice_id: invId,
      payment_id: payId,
      settlement_id: setOptionId,
      expected_status: 'EXCEPTION',
      expected_exception_type: 'FEE_MISMATCH',
    });
  } else if (i <= 365) {
    // 346..365: Timing Lag (20 cases: 4 days settlement lag)
    const lateSetDate = formatDate(addDays(new Date(payDate), 4));
    paymentRows.push(`${payId},${invId},${erpAmount.toFixed(2)},${payDate},0.00,SUCCESS`);
    bankRows.push(`${setOptionId},${payId},${erpAmount.toFixed(2)},${lateSetDate},SETTLED`);
    groundTruth.push({
      event_id: i,
      invoice_id: invId,
      payment_id: payId,
      settlement_id: setOptionId,
      expected_status: 'EXCEPTION',
      expected_exception_type: 'TIMING_LAG',
    });
  } else if (i <= 380) {
    // 366..380: Missing Bank Settlement (15 cases)
    paymentRows.push(`${payId},${invId},${erpAmount.toFixed(2)},${payDate},0.00,SUCCESS`);
    groundTruth.push({
      event_id: i,
      invoice_id: invId,
      payment_id: payId,
      settlement_id: null,
      expected_status: 'EXCEPTION',
      expected_exception_type: 'MISSING_BANK_SETTLEMENT',
    });
  } else if (i <= 390) {
    // 381..390: Missing Payment Record (10 cases)
    groundTruth.push({
      event_id: i,
      invoice_id: invId,
      payment_id: null,
      settlement_id: null,
      expected_status: 'EXCEPTION',
      expected_exception_type: 'MISSING_PAYMENT_RECORD',
    });
  } else {
    // 391..400: Duplicate Bank Settlement (10 cases)
    const dupSetId = `SET-${String(i).padStart(4, '0')}-B`;
    paymentRows.push(`${payId},${invId},${erpAmount.toFixed(2)},${payDate},0.00,SUCCESS`);
    bankRows.push(`${setOptionId},${payId},${erpAmount.toFixed(2)},${setDate},SETTLED`);
    bankRows.push(`${dupSetId},${payId},${erpAmount.toFixed(2)},${setDate},SETTLED`);
    groundTruth.push({
      event_id: i,
      invoice_id: invId,
      payment_id: payId,
      settlement_id: setOptionId,
      expected_status: 'EXCEPTION',
      expected_exception_type: 'DUPLICATE_PAYMENT',
    });
  }
}

fs.writeFileSync(path.join(outputDir, 'erp.csv'), erpRows.join('\n'), 'utf8');
fs.writeFileSync(path.join(outputDir, 'payments.csv'), paymentRows.join('\n'), 'utf8');
fs.writeFileSync(path.join(outputDir, 'bank.csv'), bankRows.join('\n'), 'utf8');
fs.writeFileSync(path.join(outputDir, 'ground-truth.json'), JSON.stringify(groundTruth, null, 2), 'utf8');

console.log('Successfully generated 400-transaction benchmark dataset:');
console.log('- 320 MATCHED');
console.log('- 25 FEE_MISMATCH');
console.log('- 20 TIMING_LAG');
console.log('- 15 MISSING_BANK_SETTLEMENT');
console.log('- 10 MISSING_PAYMENT_RECORD');
console.log('- 10 DUPLICATE_BANK');
console.log('Total: 400');
