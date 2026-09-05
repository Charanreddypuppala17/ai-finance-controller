import { describe, it, expect } from 'vitest';
import { reconcileDatasets } from '../../reconciliation/reconcile';
import { parseCsvString } from '../../reconciliation/parser';
import { parseCleanAmount, parseCleanDate, extractCoreIdentifier } from '../../reconciliation/normalizer';
import fs from 'fs';
import path from 'path';

describe('Reconciliation Engine Robustness & Edge Cases', () => {
  it('correctly handles UTF-8 BOM in CSV headers', () => {
    const erpWithBom = '\uFEFFinvoice_id,customer_id,amount,invoice_date,status\nINV-001,CUST-1,1000,2026-08-01,POSTED';
    const payWithBom = '\uFEFFpayment_id,invoice_id,amount,payment_date,fee,status\nPAY-001,INV-001,1000,2026-08-02,0,SUCCESS';
    const bankWithBom = '\uFEFFsettlement_id,payment_id,amount,settlement_date,status\nSET-001,PAY-001,1000,2026-08-03,SETTLED';

    const output = reconcileDatasets(erpWithBom, payWithBom, bankWithBom);
    expect(output.summary.totalRecords).toBe(1);
    expect(output.summary.matchedRecords).toBe(1);
    expect(output.transactions[0].status).toBe('MATCHED');
    expect(output.transactions[0].erp_amount).toBe(1000);
  });

  it('correctly parses formatted currency amounts with symbols and commas', () => {
    expect(parseCleanAmount('₹64,348.60')).toBe(64348.6);
    expect(parseCleanAmount('$1,250.00')).toBe(1250);
    expect(parseCleanAmount('50,000.00')).toBe(50000);
    expect(parseCleanAmount('(500.25)')).toBe(-500.25);
    expect(parseCleanAmount(' € 9,999.99 ')).toBe(9999.99);

    const erpCsv = `invoice_id,customer_id,amount,invoice_date,status\nINV-001,CUST-1,"₹64,348.60",2026-08-01,POSTED`;
    const payCsv = `payment_id,invoice_id,amount,payment_date,fee,status\nPAY-001,INV-001,"₹64,348.60",2026-08-02,"₹0.00",SUCCESS`;
    const bankCsv = `settlement_id,payment_id,amount,settlement_date,status\nSET-001,PAY-001,"₹64,348.60",2026-08-03,SETTLED`;

    const output = reconcileDatasets(erpCsv, payCsv, bankCsv);
    expect(output.summary.totalRecords).toBe(1);
    expect(output.summary.matchedRecords).toBe(1);
    expect(output.transactions[0].erp_amount).toBe(64348.6);
    expect(output.transactions[0].payment_amount).toBe(64348.6);
    expect(output.transactions[0].bank_amount).toBe(64348.6);
  });

  it('correctly matches cross-referenced IDs with different prefixes (ERP-TXN, GW-TXN, BNK-TXN)', () => {
    const erpCsv = `transaction_id,customer_id,amount,transaction_date,erp_reference\nTXN00305,CUST1119,57256.73,2026-08-03 11:33:00,ERP-TXN00305`;
    const payCsv = `transaction_id,customer_id,amount,transaction_date,gateway_reference,gateway_fee\nTXN00305,CUST1119,57256.73,2026-08-03 11:33:00,GW-TXN00305,1032.87`;
    const bankCsv = `transaction_id,customer_id,amount,transaction_date,bank_reference,credit_amount\nTXN00305,CUST1119,56223.86,2026-08-04 11:33:00,BNK-TXN00305,56223.86`;

    const output = reconcileDatasets(erpCsv, payCsv, bankCsv);
    expect(output.summary.totalRecords).toBe(1);
    expect(output.transactions[0].erp_amount).toBe(57256.73);
    expect(output.transactions[0].payment_amount).toBe(57256.73);
    expect(output.transactions[0].bank_amount).toBe(56223.86);
    expect(output.transactions[0].fee_amount).toBe(1032.87);
    expect(output.transactions[0].status).toBe('EXCEPTION');
    expect(output.transactions[0].exception_type).toBe('FEE_MISMATCH');
  });

  it('handles enterprise accounting headers (Invoice #, Order #, Deposit, Narration, UTR)', () => {
    const erpCsv = `Invoice #,Customer Name,Gross Amount,Posting Date\nINV-9001,Acme Corp,"15,500.00",2026-08-10`;
    const payCsv = `Order #,Payment Reference,Captured Amount,Date,Processing Fee\nINV-9001,PAY-STRIPE-888,"15,500.00",2026-08-11,310.00`;
    const bankCsv = `UTR Number,Deposit,Value Date,Particulars\nUTR-998877,"15,190.00",2026-08-12,NEFT CR INV-9001 ACME CORP`;

    const output = reconcileDatasets(erpCsv, payCsv, bankCsv);
    expect(output.summary.totalRecords).toBe(1);
    expect(output.transactions[0].erp_amount).toBe(15500);
    expect(output.transactions[0].payment_amount).toBe(15500);
    expect(output.transactions[0].bank_amount).toBe(15190);
    expect(output.transactions[0].fee_amount).toBe(310);
    expect(output.transactions[0].status).toBe('EXCEPTION');
    expect(output.transactions[0].exception_type).toBe('FEE_MISMATCH');
  });

  it('matches bank settlements through Narration text substring matching', () => {
    const erpCsv = `invoice_id,customer_id,amount,invoice_date\nINV-4042,CUST-99,8500.00,2026-08-15`;
    const payCsv = `payment_id,invoice_id,amount,payment_date,fee\nPAY-9922,INV-4042,8500.00,2026-08-16,0.00`;
    const bankCsv = `settlement_id,amount,settlement_date,narration\nSTMT-ROW-1,8500.00,2026-08-17,ACH CREDIT PAY-9922 SETTLEMENT`;

    const output = reconcileDatasets(erpCsv, payCsv, bankCsv);
    expect(output.summary.totalRecords).toBe(1);
    expect(output.summary.matchedRecords).toBe(1);
    expect(output.transactions[0].status).toBe('MATCHED');
    expect(output.transactions[0].bank_amount).toBe(8500);
  });

  it('matches disjoint IDs via unique Amount + Date proximity fallback', () => {
    const erpCsv = `invoice_id,customer_id,amount,invoice_date\nBILL-CUSTOM-99,ACME,4250.75,2026-08-20`;
    const payCsv = `payment_id,merchant_ref,amount,payment_date,fee\nCH_RAZORPAY_8888,RANDOM_KEY_123,4250.75,2026-08-21,0.00`;
    const bankCsv = `settlement_id,amount,settlement_date\nBANK_STMT_LINE_55,4250.75,2026-08-22`;

    const output = reconcileDatasets(erpCsv, payCsv, bankCsv);
    expect(output.summary.totalRecords).toBe(1);
    expect(output.summary.matchedRecords).toBe(1);
    expect(output.transactions[0].status).toBe('MATCHED');
    expect(output.transactions[0].erp_amount).toBe(4250.75);
    expect(output.transactions[0].payment_amount).toBe(4250.75);
    expect(output.transactions[0].bank_amount).toBe(4250.75);
  });

  it('extracts core alphanumeric identifiers correctly', () => {
    expect(extractCoreIdentifier('GW-TXN00305')).toBe('00305');
    expect(extractCoreIdentifier('BNK-TXN00305')).toBe('00305');
    expect(extractCoreIdentifier('INV-1001')).toBe('1001');
    expect(extractCoreIdentifier('PAY-1001')).toBe('1001');
    expect(extractCoreIdentifier('SET-1001-DUP')).toBe('1001');
  });

  it('auto-detects and corrects swapped CSV inputs', () => {
    const erpCsv = `invoice_id,customer_id,amount,invoice_date,status\nINV-001,CUST-1,1000,2026-08-01,POSTED`;
    const payCsv = `payment_id,invoice_id,amount,payment_date,fee,status\nPAY-001,INV-001,1000,2026-08-02,0,SUCCESS`;
    const bankCsv = `settlement_id,payment_id,amount,settlement_date,status\nSET-001,PAY-001,1000,2026-08-03,SETTLED`;

    // Pass bankCsv as ERP and erpCsv as Bank
    const output = reconcileDatasets(bankCsv, payCsv, erpCsv);
    expect(output.summary.totalRecords).toBe(1);
    expect(output.summary.matchedRecords).toBe(1);
  });

  it('correctly reconciles the 400-event benchmark dataset with high precision', () => {
    const erpPath = path.join(process.cwd(), 'data/benchmark-400/erp.csv');
    const payPath = path.join(process.cwd(), 'data/benchmark-400/payments.csv');
    const bankPath = path.join(process.cwd(), 'data/benchmark-400/bank.csv');

    if (fs.existsSync(erpPath) && fs.existsSync(payPath) && fs.existsSync(bankPath)) {
      const erp = fs.readFileSync(erpPath, 'utf8');
      const pay = fs.readFileSync(payPath, 'utf8');
      const bank = fs.readFileSync(bankPath, 'utf8');

      const output = reconcileDatasets(erp, pay, bank);
      expect(output.summary.totalRecords).toBe(400);
      expect(output.summary.matchedRecords).toBeGreaterThanOrEqual(320);
      expect(output.summary.matchRate).toBeGreaterThanOrEqual(80.0);
      expect(output.summary.exceptionCount).toBeLessThanOrEqual(80);
      expect(output.summary.exceptionBreakdown.FEE_MISMATCH).toBe(25);
      expect(output.summary.exceptionBreakdown.TIMING_LAG).toBe(20);
      expect(output.summary.exceptionBreakdown.MISSING_BANK_SETTLEMENT).toBe(15);
      expect(output.summary.exceptionBreakdown.MISSING_PAYMENT_RECORD).toBe(10);
    }
  });

  it('correctly reconciles the debug-uploads CSV dataset', () => {
    const erpPath = path.join(process.cwd(), 'debug-uploads/debug-erp.csv');
    const payPath = path.join(process.cwd(), 'debug-uploads/debug-payment.csv');
    const bankPath = path.join(process.cwd(), 'debug-uploads/debug-bank.csv');

    if (fs.existsSync(erpPath) && fs.existsSync(payPath) && fs.existsSync(bankPath)) {
      const erp = fs.readFileSync(erpPath, 'utf8');
      const pay = fs.readFileSync(payPath, 'utf8');
      const bank = fs.readFileSync(bankPath, 'utf8');

      const output = reconcileDatasets(erp, pay, bank);
      expect(output.summary.totalRecords).toBeGreaterThan(0);
      // Ensure payment and bank amounts are accurately populated (never 0 across the board)
      const nonZeroPayments = output.transactions.filter(t => t.payment_amount > 0);
      const nonZeroBanks = output.transactions.filter(t => t.bank_amount > 0);
      expect(nonZeroPayments.length).toBeGreaterThan(400);
      expect(nonZeroBanks.length).toBeGreaterThan(400);
    }
  });

  it('correctly reconciles 200 direct ERP-to-Bank records without double-counting (Total: 200, not 400)', () => {
    const erpRows = ['invoice_id,customer_id,amount,invoice_date,status'];
    const bankRows = ['settlement_id,customer_id,amount,settlement_date,status'];

    for (let i = 1; i <= 200; i++) {
      const invId = `INV-${10000 + i}`;
      const setDate = `2026-08-${String((i % 25) + 1).padStart(2, '0')}`;
      const amt = 5000 + i * 10;
      erpRows.push(`${invId},CUST-${i},${amt},${setDate},POSTED`);
      bankRows.push(`UTR-NEFT-${10000 + i},CUST-${i},${amt},${setDate},SETTLED`);
    }

    const output = reconcileDatasets(erpRows.join('\n'), '', bankRows.join('\n'));
    expect(output.summary.totalRecords).toBe(200);
    expect(output.summary.matchedRecords).toBe(200);
    expect(output.summary.exceptionCount).toBe(0);
    expect(output.summary.matchRate).toBe(100);
    expect(output.transactions.length).toBe(200);
  });

  it('correctly reconciles 200 records across 3 sources where Bank has UTR and payment references GTW (Total: 200)', () => {
    const erpRows = ['invoice_id,customer_id,amount,invoice_date,status'];
    const payRows = ['payment_id,invoice_id,amount,payment_date,fee,status'];
    const bankRows = ['settlement_id,payment_id,amount,settlement_date,status'];

    for (let i = 1; i <= 200; i++) {
      const invId = `INV-${10000 + i}`;
      const payId = `GTW-${900000 + i}`;
      const utrId = `UTR082000${String(i).padStart(4, '0')}`;
      const date = `2026-08-15`;
      const amt = 10000 + i * 50;

      erpRows.push(`${invId},CUST-${i},${amt},${date},POSTED`);
      payRows.push(`${payId},${invId},${amt},${date},0.00,SUCCESS`);
      bankRows.push(`${utrId},${payId},${amt},${date},SETTLED`);
    }

    const output = reconcileDatasets(erpRows.join('\n'), payRows.join('\n'), bankRows.join('\n'));
    expect(output.summary.totalRecords).toBe(200);
    expect(output.summary.matchedRecords).toBe(200);
    expect(output.summary.exceptionCount).toBe(0);
    expect(output.summary.matchRate).toBe(100);
    expect(output.transactions.length).toBe(200);
  });
});
