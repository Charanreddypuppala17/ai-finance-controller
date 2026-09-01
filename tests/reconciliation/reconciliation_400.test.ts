import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { reconcileDatasets } from '../../reconciliation/reconcile';
import { evaluateAgainstGroundTruth } from '../../reconciliation/metrics';

describe('Deterministic 400-Transaction Reconciliation Benchmark', () => {
  it('achieves 100% ground-truth classification accuracy across all 400 controlled test cases', () => {
    const erpPath = path.join(__dirname, '../../data/benchmark-400/erp.csv');
    const payPath = path.join(__dirname, '../../data/benchmark-400/payments.csv');
    const bankPath = path.join(__dirname, '../../data/benchmark-400/bank.csv');
    const groundTruthPath = path.join(__dirname, '../../data/benchmark-400/ground-truth.json');

    const erpCsv = fs.readFileSync(erpPath, 'utf8');
    const payCsv = fs.readFileSync(payPath, 'utf8');
    const bankCsv = fs.readFileSync(bankPath, 'utf8');
    const groundTruth = JSON.parse(fs.readFileSync(groundTruthPath, 'utf8'));

    const output = reconcileDatasets(erpCsv, payCsv, bankCsv);

    expect(output.summary.totalRecords).toBe(400);
    expect(output.transactions.length).toBe(400);

    // Exact count assertions matching ground truth
    expect(output.summary.matchedRecords).toBe(320);
    expect(output.summary.exceptionBreakdown.NONE).toBe(320);
    expect(output.summary.exceptionBreakdown.FEE_MISMATCH).toBe(25);
    expect(output.summary.exceptionBreakdown.TIMING_LAG).toBe(20);
    expect(output.summary.exceptionBreakdown.MISSING_BANK_SETTLEMENT).toBe(15);
    expect(output.summary.exceptionBreakdown.MISSING_PAYMENT_RECORD).toBe(10);
    expect(output.summary.exceptionBreakdown.DUPLICATE_PAYMENT).toBe(10);

    // Overall accuracy verification against ground-truth items
    let correctClassifications = 0;
    for (const item of groundTruth) {
      const actual = output.transactions.find(t => t.source_record_ids.invoice_id === item.invoice_id);
      expect(actual).toBeDefined();
      if (actual?.status === item.expected_status && actual?.exception_type === item.expected_exception_type) {
        correctClassifications++;
      } else {
        console.error(`Mismatch for ${item.invoice_id}: expected ${item.expected_exception_type}, got ${actual?.exception_type}`);
      }
    }

    expect(correctClassifications).toBe(400);
    const accuracy = (correctClassifications / 400) * 100;
    console.log(`\n=== 400-Dataset Ground Truth Benchmark: ${accuracy}% Accuracy (400/400 Exactly Matched) ===\n`);
    expect(accuracy).toBe(100);
  });
});
