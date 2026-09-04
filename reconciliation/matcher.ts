import {
  ErpRecord,
  PaymentRecord,
  BankRecord,
  ReconciledTransactionResult,
  ReconciliationToleranceOptions,
  ExceptionType,
  MatchingMethod,
  TransactionStatus,
} from './types';
import { ReconciliationIndexes } from './indexer';
import { calculateDateDiffDays, extractCoreIdentifier } from './normalizer';

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

  // Helper to find linked payments for an ERP invoice
  function findPaymentsForErp(erp: ErpRecord): PaymentRecord[] {
    const invId = erp.invoice_id;
    // 1. Exact invoice_id
    let pays = indexes.paymentsByInvoiceId.get(invId);
    if (pays && pays.length > 0) return pays;

    // 2. Exact payment_id matches invoice_id
    const paySingle = indexes.paymentsByPaymentId.get(invId);
    if (paySingle) return [paySingle];

    // 3. Core identifier match (e.g. TXN00305 inside ERP-TXN00305 / GW-TXN00305)
    const core = extractCoreIdentifier(invId);
    if (core) {
      pays = indexes.paymentsByCoreId.get(core);
      if (pays && pays.length > 0) return pays;
    }

    return [];
  }

  // Helper to find linked bank records for a payment / ERP invoice
  function findBankForPayment(pay: PaymentRecord, erp: ErpRecord): BankRecord[] {
    // 1. Direct payment_id
    let banks = indexes.bankByPaymentId.get(pay.payment_id);
    if (banks && banks.length > 0) return banks;

    // 2. Direct invoice_id
    banks = indexes.bankByPaymentId.get(pay.invoice_id);
    if (banks && banks.length > 0) return banks;

    // 3. Settlement ID matches payment_id or invoice_id
    const bankSingleByPay = indexes.bankBySettlementId.get(pay.payment_id);
    if (bankSingleByPay) return [bankSingleByPay];

    const bankSingleByInv = indexes.bankBySettlementId.get(pay.invoice_id);
    if (bankSingleByInv) return [bankSingleByInv];

    // 4. Core ID matching
    const corePay = extractCoreIdentifier(pay.payment_id);
    if (corePay) {
      banks = indexes.bankByCoreId.get(corePay);
      if (banks && banks.length > 0) return banks;
    }

    const coreInv = extractCoreIdentifier(pay.invoice_id);
    if (coreInv && coreInv !== corePay) {
      banks = indexes.bankByCoreId.get(coreInv);
      if (banks && banks.length > 0) return banks;
    }

    const coreErp = extractCoreIdentifier(erp.invoice_id);
    if (coreErp && coreErp !== corePay && coreErp !== coreInv) {
      banks = indexes.bankByCoreId.get(coreErp);
      if (banks && banks.length > 0) return banks;
    }

    return [];
  }

  // Primary Loop: Process all ERP Invoices
  for (const erp of erpRecords) {
    const invId = erp.invoice_id;
    const linkedPayments = findPaymentsForErp(erp);

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
          summary: `ERP invoice ${invId} (₹${erp.amount.toLocaleString()}) has no corresponding payment gateway transaction.`,
        },
      });
      continue;
    }

    if (linkedPayments.length > 1) {
      // Duplicate Payment Gateway Records
      const totalPayAmt = linkedPayments.reduce((acc, p) => acc + p.amount, 0);
      for (const p of linkedPayments) {
        processedPayIds.add(p.payment_id);
        const linkedBankForP = findBankForPayment(p, erp);
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

    const linkedBank = findBankForPayment(pay, erp);

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

    // Evaluate full 3-source matching
    const dateDiffDays = calculateDateDiffDays(pay.payment_date, bank.settlement_date);
    const erpVsPayDiff = Math.abs(erp.amount - pay.amount);
    const bankDiff = Math.abs(pay.amount - bank.amount);

    let status: TransactionStatus = 'MATCHED';
    let exceptionType: ExceptionType = 'NONE';
    let matchingMethod: MatchingMethod = 'LEVEL_1_EXACT_IDENTIFIER';
    let summaryText = `Exact match across ERP invoice ${invId}, Payment ${pay.payment_id}, and Bank Settlement ${bank.settlement_id}.`;

    // Check 1: ERP amount vs Payment amount discrepancy
    if (erpVsPayDiff > amountTolerance) {
      status = 'EXCEPTION';
      exceptionType = 'AMOUNT_MISMATCH';
      matchingMethod = 'LEVEL_3_AMOUNT_COMPARISON';
      summaryText = `Payment amount (₹${pay.amount.toLocaleString()}) differs from ERP invoice amount (₹${erp.amount.toLocaleString()}) by ₹${erpVsPayDiff.toFixed(2)}.`;
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
        summaryText = `Bank settlement (₹${bank.amount.toLocaleString()}) is ₹${bankDiff.toFixed(2)} lower than payment amount (₹${pay.amount.toLocaleString()}) due to gateway fee (₹${pay.fee.toLocaleString()}).`;
      } else {
        status = 'EXCEPTION';
        exceptionType = 'AMOUNT_MISMATCH';
        matchingMethod = 'LEVEL_3_AMOUNT_COMPARISON';
        summaryText = `Bank settlement amount (₹${bank.amount.toLocaleString()}) differs from payment amount (₹${pay.amount.toLocaleString()}) by ₹${bankDiff.toFixed(2)} (unexplained by fee of ₹${pay.fee.toLocaleString()}).`;
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
          summary: `Bank settlement ${bank.settlement_id} (₹${bank.amount.toLocaleString()}) has no corresponding payment or ERP invoice record.`,
        },
      });
    }
  }

  return results;
}
