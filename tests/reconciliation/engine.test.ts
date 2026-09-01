import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { reconcileDatasets } from '../../reconciliation/reconcile';
import { evaluateAgainstGroundTruth } from '../../reconciliation/metrics';

describe('Deterministic Reconciliation Engine & Ground Truth Evaluation', () => {
  it('reconciles 150 synthetic records and achieves >98% evaluation accuracy', () => {
    const erpPath = path.join(__dirname, '../../data/demo/erp.csv');
    const payPath = path.join(__dirname, '../../data/demo/payments.csv');
    const bankPath = path.join(__dirname, '../../data/demo/bank.csv');
    const groundTruthPath = path.join(__dirname, '../../data/ground-truth/expected-results.json');

    const erpCsv = fs.readFileSync(erpPath, 'utf8');
    const payCsv = fs.readFileSync(payPath, 'utf8');
    const bankCsv = fs.readFileSync(bankPath, 'utf8');
    const groundTruth = JSON.parse(fs.readFileSync(groundTruthPath, 'utf8'));

    const output = reconcileDatasets(erpCsv, payCsv, bankCsv);

    expect(output.summary.totalRecords).toBe(150);
    expect(output.transactions.length).toBe(150);

    const metrics = evaluateAgainstGroundTruth(output.transactions, groundTruth);

    console.log('\n--- Ground Truth Evaluation Metrics ---');
    console.log(`Total Events Evaluated: ${metrics.totalEvents}`);
    console.log(`Match Precision: ${metrics.matchPrecision}%`);
    console.log(`Match Recall: ${metrics.matchRecall}%`);
    console.log(`Exception Classification Accuracy: ${metrics.exceptionClassificationAccuracy}%`);
    console.log(`Overall Evaluation Accuracy: ${metrics.overallAccuracy}%`);
    console.log(`Mismatches Count: ${metrics.detailedMismatches.length}`);

    expect(metrics.matchPrecision).toBeGreaterThanOrEqual(98.0);
    expect(metrics.overallAccuracy).toBeGreaterThanOrEqual(98.0);
  });

  it('correctly classifies Transaction #17 as a Fee Mismatch', () => {
    const erpPath = path.join(__dirname, '../../data/demo/erp.csv');
    const payPath = path.join(__dirname, '../../data/demo/payments.csv');
    const bankPath = path.join(__dirname, '../../data/demo/bank.csv');

    const erpCsv = fs.readFileSync(erpPath, 'utf8');
    const payCsv = fs.readFileSync(payPath, 'utf8');
    const bankCsv = fs.readFileSync(bankPath, 'utf8');

    const output = reconcileDatasets(erpCsv, payCsv, bankCsv);
    const txn17 = output.transactions.find(t => t.source_record_ids.invoice_id === 'INV-1017');

    expect(txn17).toBeDefined();
    expect(txn17?.status).toBe('EXCEPTION');
    expect(txn17?.exception_type).toBe('FEE_MISMATCH');
    expect(txn17?.erp_amount).toBe(20000);
    expect(txn17?.payment_amount).toBe(20000);
    expect(txn17?.bank_amount).toBe(19400);
    expect(txn17?.fee_amount).toBe(600);
    expect(txn17?.difference).toBe(600);
  });
});
