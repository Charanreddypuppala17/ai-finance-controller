import {
  ErpRecord,
  PaymentRecord,
  BankRecord,
  ReconciledTransactionResult,
  ReconciliationToleranceOptions,
  MatchingEvidence,
  ExceptionType,
  MatchingMethod,
  TransactionStatus,
} from './types';
import { ReconciliationIndexes } from './indexer';
import { calculateDateDiffDays } from './normalizer';

export function matchAndClassifyTransactions(
  erpRecords: ErpRecord[],
  paymentRecords: PaymentRecord[],
  bankRecords: BankRecord[],
  indexes: ReconciliationIndexes,
  options: ReconciliationToleranceOptions = {}
): ReconciledTransactionResult[] {
  const dateToleranceDays = options.dateToleranceDays ?? 2;
  const amountTolerance = options.amountTolerance ?? 0.01;

  const results: ReconciledTransactionResult[] = [];
  const processedPayIds = new Set<string>();
  const processedBankIds = new Set<string>();

  let txnIndex = 1;

  // Primary Loop: Process all ERP Invoices
  for (const erp of erpRecords) {
    const invId = erp.invoice_id;
    const linkedPayments = indexes.paymentsByInvoiceId.get(invId) || [];

    if (linkedPayments.length === 0) {
      // Missing Payment Record
      results.push({
        transaction_id: `TXN-${String(txnIndex++).padStart(3, '0')}`,
        source_record_ids: { invoice_id: invId },
        status: 'EXCEPTION',
        exception_type: 'MISSING_PAYMENT_RECORD',
        erp_amount: erp.amount,
        payment_amount: 0,
        bank_amount: 0,
        fee_amount: 0,
        difference: erp.amount,
        date_difference_days: 0,
        matching_method: 'LEVEL_5_EXCEPTION_CLASSIFICATION',
        confidence_score: 0.95,
        resolution_state: 'OPEN',
        evidence: {
          matchedIdentifiers: { invoiceId: invId },
          checks: {
            erpToPaymentMatch: false,
            paymentToBankMatch: false,
            amountEquals: false,
            feeEqualsNetDifference: false,
            dateWithinTolerance: false,
            isDuplicate: false,
          },
          amounts: {
            erpAmount: erp.amount,
            paymentAmount: 0,
            bankAmount: 0,
            feeAmount: 0,
            netBankDifference: erp.amount,
          },
          dates: { invoiceDate: erp.invoice_date },
          summary: `ERP invoice ${invId} (₹${erp.amount}) has no corresponding payment gateway transaction.`,
        },
      });
      continue;
    }

    if (linkedPayments.length > 1) {
      // Duplicate Payment Gateway Records
      const totalPayAmt = linkedPayments.reduce((acc, p) => acc + p.amount, 0);
      for (const p of linkedPayments) {
        processedPayIds.add(p.payment_id);
        const linkedBankForP = indexes.bankByPaymentId.get(p.payment_id) || [];
        for (const b of linkedBankForP) processedBankIds.add(b.settlement_id);
      }

      results.push({
        transaction_id: `TXN-${String(txnIndex++).padStart(3, '0')}`,
        source_record_ids: { invoice_id: invId, payment_id: linkedPayments[0].payment_id },
        status: 'EXCEPTION',
        exception_type: 'DUPLICATE_PAYMENT',
        erp_amount: erp.amount,
        payment_amount: totalPayAmt,
        bank_amount: linkedPayments[0].amount,
        fee_amount: linkedPayments[0].fee,
        difference: totalPayAmt - erp.amount,
        date_difference_days: 0,
        matching_method: 'LEVEL_5_EXCEPTION_CLASSIFICATION',
        confidence_score: 0.9,
        resolution_state: 'OPEN',
        evidence: {
          matchedIdentifiers: { invoiceId: invId, paymentId: linkedPayments[0].payment_id },
          checks: {
            erpToPaymentMatch: true,
            paymentToBankMatch: false,
            amountEquals: false,
            feeEqualsNetDifference: false,
            dateWithinTolerance: true,
            isDuplicate: true,
          },
          amounts: {
            erpAmount: erp.amount,
            paymentAmount: totalPayAmt,
            bankAmount: linkedPayments[0].amount,
            feeAmount: linkedPayments[0].fee,
            netBankDifference: totalPayAmt - erp.amount,
          },
          dates: { invoiceDate: erp.invoice_date, paymentDate: linkedPayments[0].payment_date },
          summary: `Multiple payment gateway records (${linkedPayments.map(p => p.payment_id).join(', ')}) reference ERP invoice ${invId}.`,
        },
      });
      continue;
    }

    // Single Payment Record linked
    const pay = linkedPayments[0];
    processedPayIds.add(pay.payment_id);

    const linkedBank = indexes.bankByPaymentId.get(pay.payment_id) || indexes.bankByPaymentId.get(pay.invoice_id) || [];

    if (linkedBank.length === 0) {
      // Missing Bank Settlement
      results.push({
        transaction_id: `TXN-${String(txnIndex++).padStart(3, '0')}`,
        source_record_ids: { invoice_id: invId, payment_id: pay.payment_id },
        status: 'EXCEPTION',
        exception_type: 'MISSING_BANK_SETTLEMENT',
        erp_amount: erp.amount,
        payment_amount: pay.amount,
        bank_amount: 0,
        fee_amount: pay.fee,
        difference: pay.amount,
        date_difference_days: 0,
        matching_method: 'LEVEL_5_EXCEPTION_CLASSIFICATION',
        confidence_score: 0.95,
        resolution_state: 'OPEN',
        evidence: {
          matchedIdentifiers: { invoiceId: invId, paymentId: pay.payment_id },
          checks: {
            erpToPaymentMatch: true,
            paymentToBankMatch: false,
            amountEquals: false,
            feeEqualsNetDifference: false,
            dateWithinTolerance: false,
            isDuplicate: false,
          },
          amounts: {
            erpAmount: erp.amount,
            paymentAmount: pay.amount,
            bankAmount: 0,
            feeAmount: pay.fee,
            netBankDifference: pay.amount,
          },
          dates: { invoiceDate: erp.invoice_date, paymentDate: pay.payment_date },
          summary: `Payment ${pay.payment_id} was successfully collected but no bank settlement record was found.`,
        },
      });
      continue;
    }

    if (linkedBank.length > 1) {
      // Duplicate Bank Settlement Records
      const totalBankAmt = linkedBank.reduce((acc, b) => acc + b.amount, 0);
      for (const b of linkedBank) processedBankIds.add(b.settlement_id);

      results.push({
        transaction_id: `TXN-${String(txnIndex++).padStart(3, '0')}`,
        source_record_ids: {
          invoice_id: invId,
          payment_id: pay.payment_id,
          settlement_id: linkedBank.map(b => b.settlement_id).join(', '),
        },
        status: 'EXCEPTION',
        exception_type: 'DUPLICATE_PAYMENT',
        erp_amount: erp.amount,
        payment_amount: pay.amount,
        bank_amount: totalBankAmt,
        fee_amount: pay.fee,
        difference: Math.abs(totalBankAmt - pay.amount),
        date_difference_days: 0,
        matching_method: 'LEVEL_5_EXCEPTION_CLASSIFICATION',
        confidence_score: 0.9,
        resolution_state: 'OPEN',
        evidence: {
          matchedIdentifiers: {
            invoiceId: invId,
            paymentId: pay.payment_id,
            settlementId: linkedBank[0].settlement_id,
          },
          checks: {
            erpToPaymentMatch: true,
            paymentToBankMatch: false,
            amountEquals: false,
            feeEqualsNetDifference: false,
            dateWithinTolerance: true,
            isDuplicate: true,
          },
          amounts: {
            erpAmount: erp.amount,
            paymentAmount: pay.amount,
            bankAmount: totalBankAmt,
            feeAmount: pay.fee,
            netBankDifference: Math.abs(totalBankAmt - pay.amount),
          },
          dates: { invoiceDate: erp.invoice_date, paymentDate: pay.payment_date, settlementDate: linkedBank[0].settlement_date },
          summary: `Multiple bank settlement records (${linkedBank.map(b => b.settlement_id).join(', ')}) reference payment ${pay.payment_id}.`,
        },
      });
      continue;
    }

    const bank = linkedBank[0];
    processedBankIds.add(bank.settlement_id);

    // Now evaluate full 3-source matching
    const dateDiffDays = calculateDateDiffDays(pay.payment_date, bank.settlement_date);
    const erpVsPayDiff = Math.abs(erp.amount - pay.amount);
    const bankDiff = Math.abs(pay.amount - bank.amount);

    let status: TransactionStatus = 'MATCHED';
    let exceptionType: ExceptionType = 'NONE';
    let matchingMethod: MatchingMethod = 'LEVEL_1_EXACT_IDENTIFIER';
    let summaryText = `Exact match across ERP invoice ${invId}, Payment ${pay.payment_id}, and Bank Settlement ${bank.settlement_id}.`;

    // Check 1: ERP amount vs Payment amount
    if (erpVsPayDiff > amountTolerance) {
      status = 'EXCEPTION';
      exceptionType = 'AMOUNT_MISMATCH';
      matchingMethod = 'LEVEL_3_AMOUNT_COMPARISON';
      summaryText = `Payment amount (₹${pay.amount}) differs from ERP invoice amount (₹${erp.amount}) by ₹${erpVsPayDiff.toFixed(2)}.`;
    }
    // Check 2: Settlement Timing Lag
    else if (dateDiffDays > dateToleranceDays) {
      status = 'EXCEPTION';
      exceptionType = 'TIMING_LAG';
      matchingMethod = 'LEVEL_4_DATE_TOLERANCE';
      summaryText = `Bank settlement occurred ${dateDiffDays} days after payment (exceeding ${dateToleranceDays}-day tolerance window).`;
    }
    // Check 3: Fee vs Bank amount discrepancy
    else if (bankDiff > amountTolerance) {
      const isFeeMatch = Math.abs(pay.fee - bankDiff) <= amountTolerance;
      if (isFeeMatch && pay.fee > 0) {
        status = 'EXCEPTION';
        exceptionType = 'FEE_MISMATCH';
        matchingMethod = 'LEVEL_3_AMOUNT_COMPARISON';
        summaryText = `Bank settlement (₹${bank.amount}) is ₹${bankDiff.toFixed(2)} lower than payment amount (₹${pay.amount}) due to gateway fee (₹${pay.fee}).`;
      } else {
        status = 'EXCEPTION';
        exceptionType = 'AMOUNT_MISMATCH';
        matchingMethod = 'LEVEL_3_AMOUNT_COMPARISON';
        summaryText = `Bank settlement amount (₹${bank.amount}) differs from payment amount (₹${pay.amount}) by ₹${bankDiff.toFixed(2)} (unexplained by fee of ₹${pay.fee}).`;
      }
    }

    results.push({
      transaction_id: `TXN-${String(txnIndex++).padStart(3, '0')}`,
      source_record_ids: {
        invoice_id: invId,
        payment_id: pay.payment_id,
        settlement_id: bank.settlement_id,
      },
      status,
      exception_type: exceptionType,
      erp_amount: erp.amount,
      payment_amount: pay.amount,
      bank_amount: bank.amount,
      fee_amount: pay.fee,
      difference: status === 'MATCHED' ? 0 : Math.max(erpVsPayDiff, bankDiff),
      date_difference_days: dateDiffDays,
      matching_method: matchingMethod,
      confidence_score: status === 'MATCHED' ? 1.0 : 0.95,
      resolution_state: 'OPEN',
      evidence: {
        matchedIdentifiers: {
          invoiceId: invId,
          paymentId: pay.payment_id,
          settlementId: bank.settlement_id,
        },
        checks: {
          erpToPaymentMatch: erpVsPayDiff <= amountTolerance,
          paymentToBankMatch: true,
          amountEquals: erpVsPayDiff <= amountTolerance && bankDiff <= amountTolerance,
          feeEqualsNetDifference: Math.abs(pay.fee - bankDiff) <= amountTolerance,
          dateWithinTolerance: dateDiffDays <= dateToleranceDays,
          isDuplicate: false,
        },
        amounts: {
          erpAmount: erp.amount,
          paymentAmount: pay.amount,
          bankAmount: bank.amount,
          feeAmount: pay.fee,
          netBankDifference: bankDiff,
        },
        dates: {
          invoiceDate: erp.invoice_date,
          paymentDate: pay.payment_date,
          settlementDate: bank.settlement_date,
          dateDifferenceDays: dateDiffDays,
        },
        summary: summaryText,
      },
    });
  }

  // Secondary Loop: Check for unassigned Bank records not matched to any ERP invoice
  for (const bank of bankRecords) {
    if (!processedBankIds.has(bank.settlement_id)) {
      results.push({
        transaction_id: `TXN-${String(txnIndex++).padStart(3, '0')}`,
        source_record_ids: {
          settlement_id: bank.settlement_id,
          payment_id: bank.payment_id,
        },
        status: 'EXCEPTION',
        exception_type: 'UNASSIGNED_BANK_SETTLEMENT',
        erp_amount: 0,
        payment_amount: 0,
        bank_amount: bank.amount,
        fee_amount: 0,
        difference: bank.amount,
        date_difference_days: 0,
        matching_method: 'LEVEL_5_EXCEPTION_CLASSIFICATION',
        confidence_score: 0.9,
        resolution_state: 'OPEN',
        evidence: {
          matchedIdentifiers: { settlementId: bank.settlement_id, paymentId: bank.payment_id },
          checks: {
            erpToPaymentMatch: false,
            paymentToBankMatch: false,
            amountEquals: false,
            feeEqualsNetDifference: false,
            dateWithinTolerance: false,
            isDuplicate: false,
          },
          amounts: {
            erpAmount: 0,
            paymentAmount: 0,
            bankAmount: bank.amount,
            feeAmount: 0,
            netBankDifference: bank.amount,
          },
          dates: { settlementDate: bank.settlement_date },
          summary: `Bank settlement ${bank.settlement_id} (₹${bank.amount}) has no corresponding payment or ERP invoice record.`,
        },
      });
    }
  }

  return results;
}
