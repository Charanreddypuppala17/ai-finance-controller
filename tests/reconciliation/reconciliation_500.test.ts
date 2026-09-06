import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { reconcileDatasets } from '../../reconciliation/reconcile';

describe('Deterministic 500-Transaction Reconciliation Benchmark', () => {
  it('achieves 100% ground-truth classification accuracy for 40 exceptions on the 500 dataset', () => {
    const erpPath = path.join(__dirname, '../../debug-uploads/debug-erp.csv');
    const payPath = path.join(__dirname, '../../debug-uploads/debug-payment.csv');
    const bankPath = path.join(__dirname, '../../debug-uploads/debug-bank.csv');

    if (!fs.existsSync(erpPath) || !fs.existsSync(payPath) || !fs.existsSync(bankPath)) {
      console.warn('Debug uploads not found, skipping 500 benchmark test');
      return;
    }

    const erpCsv = fs.readFileSync(erpPath, 'utf-8');
    const payCsv = fs.readFileSync(payPath, 'utf-8');
    const bankCsv = fs.readFileSync(bankPath, 'utf-8');

    const result = reconcileDatasets(erpCsv, payCsv, bankCsv);

    expect(result.summary.totalRecords).toBe(500);
    expect(result.summary.matchedRecords).toBe(460);
    expect(result.summary.exceptionCount).toBe(40);
    expect(result.summary.exceptionBreakdown.MISSING_PAYMENT_RECORD).toBe(12);
    expect(result.summary.exceptionBreakdown.MISSING_BANK_SETTLEMENT).toBe(8);
    expect(result.summary.exceptionBreakdown.DUPLICATE_PAYMENT).toBe(5);
    expect(result.summary.exceptionBreakdown.AMOUNT_MISMATCH).toBe(15);

    const totalExposure = result.transactions
      .filter(t => t.status === 'EXCEPTION')
      .reduce((acc, t) => acc + (t.erp_amount || t.payment_amount || 0), 0);

    expect(Math.round(totalExposure)).toBe(1343584); // ₹13.44 Lakhs
  });
});
