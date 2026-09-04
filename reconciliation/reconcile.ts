import { parseCsvString } from './parser';
import { validateErpRecords, validatePaymentRecords, validateBankRecords } from './validator';
import { normalizeErpRecord, normalizePaymentRecord, normalizeBankRecord } from './normalizer';
import { buildReconciliationIndexes } from './indexer';
import { matchAndClassifyTransactions } from './matcher';
import { ReconciledTransactionResult, ReconciliationSummary, ReconciliationToleranceOptions, ExceptionType } from './types';

export interface ReconciliationRunOutput {
  summary: ReconciliationSummary;
  transactions: ReconciledTransactionResult[];
  errors: string[];
}

export function reconcileDatasets(
  erpCsv: string,
  paymentCsv: string,
  bankCsv: string,
  options: ReconciliationToleranceOptions = {},
  runId: string = `RUN-${Date.now()}`
): ReconciliationRunOutput {
  const errors: string[] = [];

  // Step 1: Parse CSVs
  let parsed1 = parseCsvString(erpCsv);
  let parsed2 = parseCsvString(paymentCsv);
  let parsed3 = parseCsvString(bankCsv);

  // Auto-detection & Swapping Protection
  // If files were uploaded into different card slots, detect and re-route
  const inputs = [
    { parsed: parsed1, type: parsed1.detectedType, original: 'erp' },
    { parsed: parsed2, type: parsed2.detectedType, original: 'payment' },
    { parsed: parsed3, type: parsed3.detectedType, original: 'bank' },
  ];

  const erpCandidate = inputs.find(i => i.type === 'ERP') || inputs[0];
  const paymentCandidate = inputs.find(i => i !== erpCandidate && i.type === 'PAYMENT') || 
                           inputs.find(i => i !== erpCandidate && i.original === 'payment') || 
                           inputs[1];
  const bankCandidate = inputs.find(i => i !== erpCandidate && i !== paymentCandidate) || inputs[2];

  const parsedErp = erpCandidate.parsed;
  const parsedPayment = paymentCandidate.parsed;
  const parsedBank = bankCandidate.parsed;

  errors.push(...parsedErp.errors, ...parsedPayment.errors, ...parsedBank.errors);

  // Step 2: Validate Schemas
  const validErp = validateErpRecords(parsedErp.data);
  const validPayment = validatePaymentRecords(parsedPayment.data);
  const validBank = validateBankRecords(parsedBank.data);

  // Step 3: Normalize Records
  const normalizedErp = validErp.valid.map(normalizeErpRecord);
  const normalizedPayment = validPayment.valid.map(normalizePaymentRecord);
  const normalizedBank = validBank.valid.map(normalizeBankRecord);

  // Step 4: Build Hash & Multi-Key Indexes
  const indexes = buildReconciliationIndexes(normalizedErp, normalizedPayment, normalizedBank);

  // Step 5: Execute 5-Level Matching & Exception Classification
  const transactions = matchAndClassifyTransactions(
    normalizedErp,
    normalizedPayment,
    normalizedBank,
    indexes,
    options
  );

  // Step 6: Compute Summary Metrics
  const totalRecords = transactions.length;
  const matchedRecords = transactions.filter(t => t.status === 'MATCHED').length;
  const exceptionCount = transactions.filter(t => t.status === 'EXCEPTION').length;
  const matchRate = totalRecords > 0 ? Math.round((matchedRecords / totalRecords) * 1000) / 10 : 0;

  const exceptionBreakdown: Record<ExceptionType, number> = {
    NONE: 0,
    FEE_MISMATCH: 0,
    AMOUNT_MISMATCH: 0,
    TIMING_LAG: 0,
    MISSING_BANK_SETTLEMENT: 0,
    MISSING_PAYMENT_RECORD: 0,
    DUPLICATE_PAYMENT: 0,
    UNASSIGNED_BANK_SETTLEMENT: 0,
  };

  for (const t of transactions) {
    if (t.exception_type && exceptionBreakdown[t.exception_type] !== undefined) {
      exceptionBreakdown[t.exception_type]++;
    }
  }

  const summary: ReconciliationSummary = {
    runId,
    timestamp: new Date().toISOString(),
    totalRecords,
    matchedRecords,
    exceptionCount,
    matchRate,
    exceptionBreakdown,
    sourceCounts: {
      erpCount: normalizedErp.length,
      paymentCount: normalizedPayment.length,
      bankCount: normalizedBank.length,
    },
  };

  return {
    summary,
    transactions,
    errors,
  };
}
