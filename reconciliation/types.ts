export type SourceType = 'ERP' | 'PAYMENT' | 'BANK';

export interface ErpRecord {
  invoice_id: string;
  customer_id: string;
  amount: number;
  invoice_date: string;
  status: string;
  raw?: Record<string, any>;
}

export interface PaymentRecord {
  payment_id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  fee: number;
  status: string;
  raw?: Record<string, any>;
}

export interface BankRecord {
  settlement_id: string;
  payment_id: string;
  amount: number;
  settlement_date: string;
  status: string;
  narration?: string;
  description?: string;
  raw?: Record<string, any>;
}

export type TransactionStatus = 'MATCHED' | 'EXCEPTION' | 'UNRESOLVED';

export type ExceptionType =
  | 'NONE'
  | 'FEE_MISMATCH'
  | 'AMOUNT_MISMATCH'
  | 'TIMING_LAG'
  | 'MISSING_BANK_SETTLEMENT'
  | 'MISSING_PAYMENT_RECORD'
  | 'DUPLICATE_PAYMENT'
  | 'UNASSIGNED_BANK_SETTLEMENT';

export type MatchingMethod =
  | 'LEVEL_1_EXACT_IDENTIFIER'
  | 'LEVEL_2_LINKED_REFERENCE'
  | 'LEVEL_3_AMOUNT_COMPARISON'
  | 'LEVEL_4_DATE_TOLERANCE'
  | 'LEVEL_5_EXCEPTION_CLASSIFICATION';

export interface MatchingEvidence {
  matchedIdentifiers: {
    invoiceId?: string;
    paymentId?: string;
    settlementId?: string;
  };
  checks: {
    erpToPaymentMatch: boolean;
    paymentToBankMatch: boolean;
    amountEquals: boolean;
    feeEqualsNetDifference: boolean;
    dateWithinTolerance: boolean;
    isDuplicate: boolean;
  };
  amounts: {
    erpAmount: number;
    paymentAmount: number;
    bankAmount: number;
    feeAmount: number;
    netBankDifference: number;
  };
  dates: {
    invoiceDate?: string;
    paymentDate?: string;
    settlementDate?: string;
    dateDifferenceDays?: number;
  };
  summary: string;
}

export interface ReconciledTransactionResult {
  transaction_id: string; // E.g. TXN-001 or matching index
  user_id?: string;
  run_id?: string;
  source_record_ids: {
    invoice_id?: string;
    payment_id?: string;
    settlement_id?: string;
  };
  status: TransactionStatus;
  exception_type: ExceptionType;
  erp_amount: number;
  payment_amount: number;
  bank_amount: number;
  fee_amount: number;
  difference: number;
  date_difference_days: number;
  matching_method: MatchingMethod;
  evidence: MatchingEvidence;
  confidence_score: number; // 0 to 1.0
  resolution_state: 'OPEN' | 'RESOLVED' | 'KEPT_OPEN';
}

export interface ReconciliationSummary {
  runId: string;
  timestamp: string;
  totalRecords: number;
  matchedRecords: number;
  exceptionCount: number;
  matchRate: number; // Percentage, e.g. 60.0
  exceptionBreakdown: Record<ExceptionType, number>;
  sourceCounts: {
    erpCount: number;
    paymentCount: number;
    bankCount: number;
  };
}

export interface ReconciliationToleranceOptions {
  dateToleranceDays?: number; // Default 2 days (Standard T+2 settlement window)
  amountTolerance?: number;   // Default 0.01 (1 cent)
  autoClassifyFees?: boolean; // Default true
}
