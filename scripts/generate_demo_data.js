const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data/demo');
const groundTruthDir = path.join(__dirname, '../data/ground-truth');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(groundTruthDir)) fs.mkdirSync(groundTruthDir, { recursive: true });

const erpRows = ['invoice_id,customer_id,amount,invoice_date,status'];
const paymentRows = ['payment_id,invoice_id,amount,payment_date,fee,status'];
const bankRows = ['settlement_id,payment_id,amount,settlement_date,status'];

const groundTruth = [];

// Base date: 2026-08-01
const baseDate = new Date('2026-08-01');

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function addDays(d, days) {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}

// Generate 150 financial events
for (let i = 1; i <= 150; i++) {
  const invId = `INV-${1000 + i}`;
  const custId = `CUST-${500 + (i % 20)}`;
  const invDate = formatDate(addDays(baseDate, (i % 15)));
  
  let erpAmount = 1000 + (i * 250);
  // Special transaction #17 highlight override if i == 17
  if (i === 17) {
    erpAmount = 20000;
  }

  erpRows.push(`${invId},${custId},${erpAmount.toFixed(2)},${invDate},POSTED`);

  const payId = `PAY-${1000 + i}`;
  const payDate = formatDate(addDays(new Date(invDate), 1));
  const setDate = formatDate(addDays(new Date(payDate), 1));
  const setOptionId = `SET-${1000 + i}`;

  if (i === 17) {
    // Transaction #17: Fee Mismatch (ERP: 20000, Payment: 20000, Bank: 19400, Fee: 600)
    paymentRows.push(`${payId},${invId},20000.00,${payDate},600.00,SUCCESS`);
    bankRows.push(`${setOptionId},${payId},19400.00,${setDate},SETTLED`);
    groundTruth.push({
      event_id: i,
      invoice_id: invId,
      payment_id: payId,
      settlement_id: setOptionId,
      expected_status: 'EXCEPTION',
      expected_exception_type: 'FEE_MISMATCH',
      erp_amount: 20000,
      payment_amount: 20000,
      bank_amount: 19400,
      fee_amount: 600,
      difference: 600,
      reason: 'Bank settlement is ₹600 lower than payment amount due to gateway fee.'
    });
  } else if (i <= 90) {
    // 1..90: Exact Matches (Fee is 0 or matches net)
    paymentRows.push(`${payId},${invId},${erpAmount.toFixed(2)},${payDate},0.00,SUCCESS`);
    bankRows.push(`${setOptionId},${payId},${erpAmount.toFixed(2)},${setDate},SETTLED`);
    groundTruth.push({
      event_id: i,
      invoice_id: invId,
      payment_id: payId,
      settlement_id: setOptionId,
      expected_status: 'MATCHED',
      expected_exception_type: 'NONE',
      erp_amount: erpAmount,
      payment_amount: erpAmount,
      bank_amount: erpAmount,
      fee_amount: 0,
      difference: 0,
      reason: 'Exact match across ERP, Payment Gateway, and Bank Settlement.'
    });
  } else if (i <= 105) {
    // 91..105: Fee Mismatch
    const fee = 50 + (i % 10) * 10;
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
      erp_amount: erpAmount,
      payment_amount: erpAmount,
      bank_amount: bankAmt,
      fee_amount: fee,
      difference: fee,
      reason: `Bank settlement is ₹${fee} lower due to payment gateway transaction fee.`
    });
  } else if (i <= 120) {
    // 106..120: Amount Mismatch (Discrepancy in payment amount)
    const shortAmt = erpAmount - 250;
    paymentRows.push(`${payId},${invId},${shortAmt.toFixed(2)},${payDate},0.00,SUCCESS`);
    bankRows.push(`${setOptionId},${payId},${shortAmt.toFixed(2)},${setDate},SETTLED`);
    groundTruth.push({
      event_id: i,
      invoice_id: invId,
      payment_id: payId,
      settlement_id: setOptionId,
      expected_status: 'EXCEPTION',
      expected_exception_type: 'AMOUNT_MISMATCH',
      erp_amount: erpAmount,
      payment_amount: shortAmt,
      bank_amount: shortAmt,
      fee_amount: 0,
      difference: 250,
      reason: 'Payment amount is ₹250 lower than the original ERP invoice amount.'
    });
  } else if (i <= 130) {
    // 121..130: Timing Lag (Bank settlement 7 days after payment date)
    const lateSetDate = formatDate(addDays(new Date(payDate), 7));
    paymentRows.push(`${payId},${invId},${erpAmount.toFixed(2)},${payDate},0.00,SUCCESS`);
    bankRows.push(`${setOptionId},${payId},${erpAmount.toFixed(2)},${lateSetDate},SETTLED`);
    groundTruth.push({
      event_id: i,
      invoice_id: invId,
      payment_id: payId,
      settlement_id: setOptionId,
      expected_status: 'EXCEPTION',
      expected_exception_type: 'TIMING_LAG',
      erp_amount: erpAmount,
      payment_amount: erpAmount,
      bank_amount: erpAmount,
      fee_amount: 0,
      difference: 0,
      date_difference_days: 7,
      reason: 'Bank settlement occurred 7 days after payment, exceeding tolerance window.'
    });
  } else if (i <= 140) {
    // 131..140: Missing Bank Settlement
    paymentRows.push(`${payId},${invId},${erpAmount.toFixed(2)},${payDate},0.00,SUCCESS`);
    groundTruth.push({
      event_id: i,
      invoice_id: invId,
      payment_id: payId,
      settlement_id: null,
      expected_status: 'EXCEPTION',
      expected_exception_type: 'MISSING_BANK_SETTLEMENT',
      erp_amount: erpAmount,
      payment_amount: erpAmount,
      bank_amount: 0,
      fee_amount: 0,
      difference: erpAmount,
      reason: 'Payment was processed but no bank settlement record was found.'
    });
  } else if (i <= 145) {
    // 141..145: Missing Payment Record
    groundTruth.push({
      event_id: i,
      invoice_id: invId,
      payment_id: null,
      settlement_id: null,
      expected_status: 'EXCEPTION',
      expected_exception_type: 'MISSING_PAYMENT_RECORD',
      erp_amount: erpAmount,
      payment_amount: 0,
      bank_amount: 0,
      fee_amount: 0,
      difference: erpAmount,
      reason: 'ERP invoice has no corresponding payment gateway or bank record.'
    });
  } else {
    // 146..150: Duplicate Payment
    const dupPayId = `PAY-${1000 + i}-DUP`;
    paymentRows.push(`${payId},${invId},${erpAmount.toFixed(2)},${payDate},0.00,SUCCESS`);
    paymentRows.push(`${dupPayId},${invId},${erpAmount.toFixed(2)},${payDate},0.00,SUCCESS`);
    bankRows.push(`${setOptionId},${payId},${erpAmount.toFixed(2)},${setDate},SETTLED`);
    groundTruth.push({
      event_id: i,
      invoice_id: invId,
      payment_id: payId,
      settlement_id: setOptionId,
      expected_status: 'EXCEPTION',
      expected_exception_type: 'DUPLICATE_PAYMENT',
      erp_amount: erpAmount,
      payment_amount: erpAmount * 2,
      bank_amount: erpAmount,
      fee_amount: 0,
      difference: erpAmount,
      reason: `Duplicate payment gateway records detected for invoice ${invId}.`
    });
  }
}

fs.writeFileSync(path.join(dataDir, 'erp.csv'), erpRows.join('\n'), 'utf8');
fs.writeFileSync(path.join(dataDir, 'payments.csv'), paymentRows.join('\n'), 'utf8');
fs.writeFileSync(path.join(dataDir, 'bank.csv'), bankRows.join('\n'), 'utf8');
fs.writeFileSync(path.join(groundTruthDir, 'expected-results.json'), JSON.stringify(groundTruth, null, 2), 'utf8');

console.log('Successfully generated synthetic datasets (ERP, Payments, Bank) and expected-results.json');
