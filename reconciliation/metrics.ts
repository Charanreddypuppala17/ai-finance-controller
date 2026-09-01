import { ReconciledTransactionResult } from './types';

export interface GroundTruthItem {
  event_id: number;
  invoice_id: string;
  payment_id: string | null;
  settlement_id: string | null;
  expected_status: 'MATCHED' | 'EXCEPTION';
  expected_exception_type: string;
  erp_amount: number;
  payment_amount: number;
  bank_amount: number;
  fee_amount: number;
  difference: number;
  reason?: string;
}

export interface EvaluationMetricsResult {
  totalEvents: number;
  correctStatusMatches: number;
  correctExceptionClassifications: number;
  truePositives: number; // Correctly identified matches
  falsePositives: number; // Mismatched flagged as match
  falseNegatives: number; // True match flagged as exception
  matchPrecision: number; // TP / (TP + FP)
  matchRecall: number;    // TP / (TP + FN)
  exceptionClassificationAccuracy: number; // Correct Exception Types / Total Exceptions
  overallAccuracy: number; // Total Correct / Total Events
  detailedMismatches: Array<{
    eventId: number;
    invoiceId: string;
    expectedStatus: string;
    actualStatus: string;
    expectedType: string;
    actualType: string;
  }>;
}

export function evaluateAgainstGroundTruth(
  results: ReconciledTransactionResult[],
  groundTruth: GroundTruthItem[]
): EvaluationMetricsResult {
  const resultMap = new Map<string, ReconciledTransactionResult>();
  for (const res of results) {
    if (res.source_record_ids.invoice_id) {
      resultMap.set(res.source_record_ids.invoice_id, res);
    }
  }

  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let correctStatusMatches = 0;
  let correctExceptionClassifications = 0;
  let totalExceptionsExpected = 0;

  const detailedMismatches: Array<{
    eventId: number;
    invoiceId: string;
    expectedStatus: string;
    actualStatus: string;
    expectedType: string;
    actualType: string;
  }> = [];

  for (const expected of groundTruth) {
    const actual = resultMap.get(expected.invoice_id);

    if (!actual) {
      detailedMismatches.push({
        eventId: expected.event_id,
        invoiceId: expected.invoice_id,
        expectedStatus: expected.expected_status,
        actualStatus: 'MISSING_RESULT',
        expectedType: expected.expected_exception_type,
        actualType: 'NONE',
      });
      continue;
    }

    const statusMatch = actual.status === expected.expected_status;
    const typeMatch = actual.exception_type === expected.expected_exception_type;

    if (statusMatch) {
      correctStatusMatches++;
    }

    if (expected.expected_status === 'MATCHED') {
      if (actual.status === 'MATCHED') {
        truePositives++;
      } else {
        falseNegatives++;
      }
    } else {
      totalExceptionsExpected++;
      if (actual.status === 'MATCHED') {
        falsePositives++;
      }
      if (typeMatch) {
        correctExceptionClassifications++;
      }
    }

    if (!statusMatch || !typeMatch) {
      detailedMismatches.push({
        eventId: expected.event_id,
        invoiceId: expected.invoice_id,
        expectedStatus: expected.expected_status,
        actualStatus: actual.status,
        expectedType: expected.expected_exception_type,
        actualType: actual.exception_type,
      });
    }
  }

  const totalEvents = groundTruth.length;
  const matchPrecision = truePositives + falsePositives > 0 ? (truePositives / (truePositives + falsePositives)) * 100 : 100;
  const matchRecall = truePositives + falseNegatives > 0 ? (truePositives / (truePositives + falseNegatives)) * 100 : 100;
  const exceptionClassificationAccuracy = totalExceptionsExpected > 0 ? (correctExceptionClassifications / totalExceptionsExpected) * 100 : 100;
  const overallAccuracy = ((totalEvents - detailedMismatches.length) / totalEvents) * 100;

  return {
    totalEvents,
    correctStatusMatches,
    correctExceptionClassifications,
    truePositives,
    falsePositives,
    falseNegatives,
    matchPrecision: Math.round(matchPrecision * 10) / 10,
    matchRecall: Math.round(matchRecall * 10) / 10,
    exceptionClassificationAccuracy: Math.round(exceptionClassificationAccuracy * 10) / 10,
    overallAccuracy: Math.round(overallAccuracy * 10) / 10,
    detailedMismatches,
  };
}
