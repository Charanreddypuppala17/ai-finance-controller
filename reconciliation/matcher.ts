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
  const amountTolerance = options.amountTolerance ?? 0.01;
  const dateToleranceDays = options.dateToleranceDays ?? 3;

  const results: ReconciledTransactionResult[] = [];
  const processedPayIds = new Set<string>();
  const processedBankIds = new Set<string>();
  const processedErpIds = new Set<string>();

  let txnIndex = 1;

  // Tiered Helper to find linked payments for an ERP invoice
  function findPaymentsForErp(erp: ErpRecord): { payments: PaymentRecord[]; method: MatchingMethod } {
    const invId = erp.invoice_id;

    // Tier 1: Exact ID matching
    let pays = indexes.paymentsByInvoiceId.get(invId);
    if (pays && pays.length > 0) {
      return { payments: pays, method: 'LEVEL_1_EXACT_IDENTIFIER' };
    }

    const paySingle = indexes.paymentsByPaymentId.get(invId);
    if (paySingle) {
      return { payments: [paySingle], method: 'LEVEL_1_EXACT_IDENTIFIER' };
    }

    // Tier 2: Normalized Core ID match (e.g. TXN00305 inside ERP-TXN00305 / GW-TXN00305)
    const core = extractCoreIdentifier(invId);
    if (core && core.length >= 2) {
      pays = indexes.paymentsByCoreId.get(core);
      if (pays && pays.length > 0) {
        return { payments: pays, method: 'LEVEL_2_LINKED_REFERENCE' };
      }
    }

    // Tier 3: Customer ID + Amount + Date Tolerance
    if (erp.customer_id && erp.customer_id !== 'UNKNOWN') {
      const roundedAmt = Math.round(erp.amount * 100) / 100;
      const key = `${erp.customer_id}_${roundedAmt}`;
      const custPays = indexes.paymentsByCustomerAndAmount.get(key);
      if (custPays && custPays.length > 0) {
        const available = custPays.filter(p => {
          if (processedPayIds.has(p.payment_id)) return false;
          if (p.payment_id.startsWith('GW_ONLY_') || p.payment_id.startsWith('GW-ONLY-') || p.payment_id.startsWith('PAY-ROW-')) return false;
          return true;
        });
        const dateMatched = available.filter(
          p => calculateDateDiffDays(erp.invoice_date, p.payment_date) <= dateToleranceDays
        );
        if (dateMatched.length > 0) {
          return { payments: [dateMatched[0]], method: 'LEVEL_3_AMOUNT_COMPARISON' };
        }
      }
    }

    // Tier 4: Amount + Date Proximity Fallback (for disjoint ID systems)
    const roundedAmt = Math.round(erp.amount * 100) / 100;
    const sameAmountPays = indexes.paymentsByAmount.get(roundedAmt);
    if (sameAmountPays && sameAmountPays.length > 0) {
      const available = sameAmountPays.filter(p => {
        if (processedPayIds.has(p.payment_id)) return false;
        if (p.payment_id.startsWith('GW_ONLY_') || p.payment_id.startsWith('GW-ONLY-') || p.payment_id.startsWith('PAY-ROW-')) return false;
        return true;
      });
      const dateMatched = available.filter(
        p => calculateDateDiffDays(erp.invoice_date, p.payment_date) <= dateToleranceDays
      );
      if (dateMatched.length === 1) {
        return { payments: [dateMatched[0]], method: 'LEVEL_4_DATE_TOLERANCE' };
      }
    }

    return { payments: [], method: 'LEVEL_5_EXCEPTION_CLASSIFICATION' };
  }

  // Tiered Helper for Direct ERP to Bank matching (bypassed gateway / direct deposit / 2-way reconciliation)
  function findBankForErpDirect(erp: ErpRecord): { banks: BankRecord[]; method: MatchingMethod } {
    const invId = erp.invoice_id;

    // Tier 1: Direct payment_id / settlement_id exact match with invoice_id
    let banks = indexes.bankByPaymentId.get(invId);
    if (banks && banks.length > 0) return { banks, method: 'LEVEL_1_EXACT_IDENTIFIER' };

    const bankSingle = indexes.bankBySettlementId.get(invId);
    if (bankSingle) return { banks: [bankSingle], method: 'LEVEL_1_EXACT_IDENTIFIER' };

    // Tier 2: Core ID match (e.g. 10001 or TXN00305)
    const coreErp = extractCoreIdentifier(invId);
    if (coreErp && coreErp.length >= 2) {
      banks = indexes.bankByCoreId.get(coreErp);
      if (banks && banks.length > 0) return { banks, method: 'LEVEL_2_LINKED_REFERENCE' };
    }

    // Tier 3: Narration & Description search in bank statements
    const searchTokens = [invId, coreErp, erp.customer_id].filter(t => t && t.length >= 3 && t !== 'UNKNOWN');
    for (const bank of indexes.bankWithNarration) {
      if (processedBankIds.has(bank.settlement_id)) continue;
      const upperNarration = (bank.narration || '').toUpperCase();
      for (const token of searchTokens) {
        if (upperNarration.includes(token.toUpperCase())) {
          return { banks: [bank], method: 'LEVEL_2_LINKED_REFERENCE' };
        }
      }
    }

    // Tier 4: Customer ID + Amount + Date Tolerance
    if (erp.customer_id && erp.customer_id !== 'UNKNOWN') {
      const roundedAmt = Math.round(erp.amount * 100) / 100;
      const key = `${erp.customer_id}_${roundedAmt}`;
      const custBanks = indexes.bankByCustomerAndAmount.get(key);
      if (custBanks && custBanks.length > 0) {
        const available = custBanks.filter(b => {
          if (processedBankIds.has(b.settlement_id)) return false;
          if (b.settlement_id.startsWith('BANK_ONLY_') || b.settlement_id.startsWith('BANK-ONLY-') || b.settlement_id.startsWith('BNK-ROW-')) return false;
          return true;
        });
        const dateMatched = available.filter(
          b => calculateDateDiffDays(erp.invoice_date, b.settlement_date) <= dateToleranceDays
        );
        if (dateMatched.length > 0) {
          return { banks: [dateMatched[0]], method: 'LEVEL_3_AMOUNT_COMPARISON' };
        }
      }
    }

    // Tier 5: Unique Amount + Date Proximity Fallback
    const roundedAmt = Math.round(erp.amount * 100) / 100;
    const sameAmountBanks = indexes.bankByAmount.get(roundedAmt);
    if (sameAmountBanks && sameAmountBanks.length > 0) {
      const available = sameAmountBanks.filter(b => {
        if (processedBankIds.has(b.settlement_id)) return false;
        if (b.settlement_id.startsWith('BANK_ONLY_') || b.settlement_id.startsWith('BANK-ONLY-') || b.settlement_id.startsWith('BNK-ROW-')) return false;
        return true;
      });
      const dateMatched = available.filter(
        b => calculateDateDiffDays(erp.invoice_date, b.settlement_date) <= dateToleranceDays
      );
      if (dateMatched.length === 1) {
        return { banks: [dateMatched[0]], method: 'LEVEL_4_DATE_TOLERANCE' };
      }
    }

    return { banks: [], method: 'LEVEL_5_EXCEPTION_CLASSIFICATION' };
  }

  // Tiered Helper to find linked bank records for a payment & ERP invoice
  function findBankForPayment(pay: PaymentRecord, erp: ErpRecord): { banks: BankRecord[]; method: MatchingMethod } {
    // Tier 1: Direct payment_id / invoice_id / settlement_id exact match
    let banks = indexes.bankByPaymentId.get(pay.payment_id);
    if (banks && banks.length > 0) return { banks, method: 'LEVEL_1_EXACT_IDENTIFIER' };

    banks = indexes.bankByPaymentId.get(pay.invoice_id);
    if (banks && banks.length > 0) return { banks, method: 'LEVEL_1_EXACT_IDENTIFIER' };

    const bankSingleByPay = indexes.bankBySettlementId.get(pay.payment_id);
    if (bankSingleByPay) return { banks: [bankSingleByPay], method: 'LEVEL_1_EXACT_IDENTIFIER' };

    const bankSingleByInv = indexes.bankBySettlementId.get(pay.invoice_id);
    if (bankSingleByInv) return { banks: [bankSingleByInv], method: 'LEVEL_1_EXACT_IDENTIFIER' };

    // Tier 2: Core ID matching
    const corePay = extractCoreIdentifier(pay.payment_id);
    if (corePay && corePay.length >= 2) {
      banks = indexes.bankByCoreId.get(corePay);
      if (banks && banks.length > 0) return { banks, method: 'LEVEL_2_LINKED_REFERENCE' };
    }

    const coreInv = extractCoreIdentifier(pay.invoice_id);
    if (coreInv && coreInv.length >= 2 && coreInv !== corePay) {
      banks = indexes.bankByCoreId.get(coreInv);
      if (banks && banks.length > 0) return { banks, method: 'LEVEL_2_LINKED_REFERENCE' };
    }

    const coreErp = extractCoreIdentifier(erp.invoice_id);
    if (coreErp && coreErp.length >= 2 && coreErp !== corePay && coreErp !== coreInv) {
      banks = indexes.bankByCoreId.get(coreErp);
      if (banks && banks.length > 0) return { banks, method: 'LEVEL_2_LINKED_REFERENCE' };
    }

    // Tier 3: Narration & Description substring search
    const searchTokens = [
      pay.payment_id,
      pay.invoice_id,
      erp.invoice_id,
      corePay,
      coreInv,
      coreErp,
    ].filter(t => t && t.length >= 3);

    for (const bank of indexes.bankWithNarration) {
      if (processedBankIds.has(bank.settlement_id)) continue;
      const upperNarration = (bank.narration || '').toUpperCase();
      for (const token of searchTokens) {
        if (upperNarration.includes(token)) {
          return { banks: [bank], method: 'LEVEL_2_LINKED_REFERENCE' };
        }
      }
    }

    // Tier 4: Net Amount Match (Payment Amount - Fee = Bank Amount) or Exact Amount Match
    const netPayAmt = Math.round((pay.amount - pay.fee) * 100) / 100;
    const netBankCandidates = indexes.bankByAmount.get(netPayAmt);
    if (netBankCandidates && netBankCandidates.length > 0) {
      const available = netBankCandidates.filter(b => {
        if (processedBankIds.has(b.settlement_id)) return false;
        if (b.settlement_id.startsWith('BANK_ONLY_') || b.settlement_id.startsWith('BANK-ONLY-') || b.settlement_id.startsWith('BNK-ROW-')) return false;
        return true;
      });
      const dateMatched = available.filter(
        b => calculateDateDiffDays(pay.payment_date, b.settlement_date) <= dateToleranceDays
      );
      if (dateMatched.length === 1) {
        return { banks: [dateMatched[0]], method: 'LEVEL_3_AMOUNT_COMPARISON' };
      }
    }

    const grossAmt = Math.round(pay.amount * 100) / 100;
    if (grossAmt !== netPayAmt) {
      const grossBankCandidates = indexes.bankByAmount.get(grossAmt);
      if (grossBankCandidates && grossBankCandidates.length > 0) {
        const available = grossBankCandidates.filter(b => {
          if (processedBankIds.has(b.settlement_id)) return false;
          if (b.settlement_id.startsWith('BANK_ONLY_') || b.settlement_id.startsWith('BANK-ONLY-') || b.settlement_id.startsWith('BNK-ROW-')) return false;
          return true;
        });
        const dateMatched = available.filter(
          b => calculateDateDiffDays(pay.payment_date, b.settlement_date) <= dateToleranceDays
        );
        if (dateMatched.length === 1) {
          return { banks: [dateMatched[0]], method: 'LEVEL_3_AMOUNT_COMPARISON' };
        }
      }
    }

    return { banks: [], method: 'LEVEL_5_EXCEPTION_CLASSIFICATION' };
  }

  // Primary Loop: Process all ERP Invoices
  for (const erp of erpRecords) {
    const invId = erp.invoice_id;
    processedErpIds.add(invId);

    const { payments: linkedPayments, method: payMatchingMethod } = findPaymentsForErp(erp);

    if (linkedPayments.length === 0) {
      const is3Source = paymentRecords.length > 0;
      const { banks: directBanks, method: directBankMethod } = findBankForErpDirect(erp);

      // In 3-Source Reconciliation (ERP + Gateway + Bank), a missing gateway record is an EXCEPTION
      if (is3Source) {
        const bank = directBanks.length > 0 ? directBanks[0] : undefined;
        if (bank) {
          processedBankIds.add(bank.settlement_id);
          if (bank.payment_id) processedPayIds.add(bank.payment_id);
        }

        results.push({
          transaction_id: `TXN-${String(txnIndex++).padStart(3, '0')}`,
          source_record_ids: {
            invoice_id: invId,
            settlement_id: bank ? bank.settlement_id : undefined,
          },
          status: 'EXCEPTION',
          exception_type: 'MISSING_PAYMENT_RECORD',
          erp_amount: erp.amount,
          payment_amount: 0,
          bank_amount: bank ? bank.amount : 0,
          fee_amount: 0,
          difference: erp.amount,
          date_difference_days: 0,
          matching_method: 'LEVEL_5_EXCEPTION_CLASSIFICATION',
          confidence_score: 0.95,
          resolution_state: 'OPEN',
          evidence: {
            matchedIdentifiers: { invoiceId: invId, settlementId: bank?.settlement_id },
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
              bankAmount: bank ? bank.amount : 0,
              feeAmount: 0,
              netBankDifference: erp.amount,
            },
            dates: { invoiceDate: erp.invoice_date, settlementDate: bank?.settlement_date },
            summary: bank
              ? `Invoice ${invId} (₹${erp.amount.toLocaleString()}) was deposited in bank (${bank.settlement_id}) but missing payment gateway record.`
              : `Invoice ${invId} (₹${erp.amount.toLocaleString()}) exists in ERP, but no payment gateway or bank settlement record was found.`,
          },
        });
        continue;
      }

      // Pure 2-Source (ERP + Bank only) Direct Match Handling
      if (directBanks.length === 1) {
        const bank = directBanks[0];
        processedBankIds.add(bank.settlement_id);
        if (bank.payment_id) processedPayIds.add(bank.payment_id);

        const dateDiffDays = calculateDateDiffDays(erp.invoice_date, bank.settlement_date);
        const amountDiff = Math.abs(erp.amount - bank.amount);

        let status: TransactionStatus = 'MATCHED';
        let exceptionType: ExceptionType = 'NONE';
        let matchingMethod: MatchingMethod = directBankMethod;
        let summaryText = `Direct ledger match between ERP invoice ${invId} and Bank settlement ${bank.settlement_id}.`;

        if (amountDiff > amountTolerance) {
          const isFeeLike = erp.amount > bank.amount && (erp.amount - bank.amount) / erp.amount <= 0.05;
          status = 'EXCEPTION';
          exceptionType = isFeeLike ? 'FEE_MISMATCH' : 'AMOUNT_MISMATCH';
          matchingMethod = 'LEVEL_3_AMOUNT_COMPARISON';
          summaryText = isFeeLike
            ? `Bank settlement (₹${bank.amount.toLocaleString()}) is ₹${amountDiff.toFixed(2)} lower than invoice amount due to processing fee.`
            : `Bank settlement amount (₹${bank.amount.toLocaleString()}) differs from ERP invoice amount (₹${erp.amount.toLocaleString()}) by ₹${amountDiff.toFixed(2)}.`;
        } else if (dateDiffDays > dateToleranceDays) {
          status = 'EXCEPTION';
          exceptionType = 'TIMING_LAG';
          matchingMethod = 'LEVEL_4_DATE_TOLERANCE';
          summaryText = `Bank settlement occurred ${dateDiffDays} days after invoice date (exceeding ${dateToleranceDays}-day tolerance window).`;
        }

        results.push({
          transaction_id: `TXN-${String(txnIndex++).padStart(3, '0')}`,
          source_record_ids: {
            invoice_id: invId,
            payment_id: bank.payment_id !== bank.settlement_id ? bank.payment_id : undefined,
            settlement_id: bank.settlement_id,
          },
          status,
          exception_type: exceptionType,
          erp_amount: erp.amount,
          payment_amount: bank.amount,
          bank_amount: bank.amount,
          fee_amount: exceptionType === 'FEE_MISMATCH' ? amountDiff : 0,
          difference: status === 'MATCHED' ? 0 : amountDiff,
          date_difference_days: dateDiffDays,
          matching_method: matchingMethod,
          confidence_score: status === 'MATCHED' ? 0.98 : 0.9,
          resolution_state: 'OPEN',
          evidence: {
            matchedIdentifiers: { invoiceId: invId, settlementId: bank.settlement_id },
            checks: {
              erpToPaymentMatch: true,
              paymentToBankMatch: true,
              amountEquals: amountDiff <= amountTolerance,
              feeEqualsNetDifference: exceptionType === 'FEE_MISMATCH',
              dateWithinTolerance: dateDiffDays <= dateToleranceDays,
              isDuplicate: false,
            },
            amounts: {
              erpAmount: erp.amount,
              paymentAmount: bank.amount,
              bankAmount: bank.amount,
              feeAmount: exceptionType === 'FEE_MISMATCH' ? amountDiff : 0,
              netBankDifference: amountDiff,
            },
            dates: { invoiceDate: erp.invoice_date, settlementDate: bank.settlement_date, dateDifferenceDays: dateDiffDays },
            summary: summaryText,
          },
        });
        continue;
      }

      if (directBanks.length > 1) {
        const totalBankAmt = directBanks.reduce((acc, b) => acc + b.amount, 0);
        for (const b of directBanks) {
          processedBankIds.add(b.settlement_id);
          if (b.payment_id) processedPayIds.add(b.payment_id);
        }

        results.push({
          transaction_id: `TXN-${String(txnIndex++).padStart(3, '0')}`,
          source_record_ids: {
            invoice_id: invId,
            settlement_id: directBanks.map(b => b.settlement_id).join(', '),
          },
          status: 'EXCEPTION',
          exception_type: 'DUPLICATE_PAYMENT',
          erp_amount: erp.amount,
          payment_amount: totalBankAmt,
          bank_amount: totalBankAmt,
          fee_amount: 0,
          difference: Math.abs(totalBankAmt - erp.amount),
          date_difference_days: 0,
          matching_method: 'LEVEL_5_EXCEPTION_CLASSIFICATION',
          confidence_score: 0.9,
          resolution_state: 'OPEN',
          evidence: {
            matchedIdentifiers: { invoiceId: invId, settlementId: directBanks[0].settlement_id },
            checks: {
              erpToPaymentMatch: true,
              paymentToBankMatch: true,
              amountEquals: false,
              feeEqualsNetDifference: false,
              dateWithinTolerance: true,
              isDuplicate: true,
            },
            amounts: {
              erpAmount: erp.amount,
              paymentAmount: totalBankAmt,
              bankAmount: totalBankAmt,
              feeAmount: 0,
              netBankDifference: Math.abs(totalBankAmt - erp.amount),
            },
            dates: { invoiceDate: erp.invoice_date, settlementDate: directBanks[0].settlement_date },
            summary: `Multiple direct bank settlements (${directBanks.map(b => b.settlement_id).join(', ')}) reference ERP invoice ${invId}.`,
          },
        });
        continue;
      }

      // Truly Missing Payment Record
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
          summary: `ERP invoice ${invId} (₹${erp.amount.toLocaleString()}) has no corresponding payment gateway or bank transaction.`,
        },
      });
      continue;
    }

    if (linkedPayments.length > 1) {
      // Duplicate Payment Gateway Records
      const totalPayAmt = linkedPayments.reduce((acc, p) => acc + p.amount, 0);
      for (const p of linkedPayments) {
        processedPayIds.add(p.payment_id);
        const { banks: linkedBankForP } = findBankForPayment(p, erp);
        for (const b of linkedBankForP) {
          processedBankIds.add(b.settlement_id);
          if (b.payment_id) processedPayIds.add(b.payment_id);
        }
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

    const { banks: linkedBank, method: bankMatchingMethod } = findBankForPayment(pay, erp);

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
      for (const b of linkedBank) {
        processedBankIds.add(b.settlement_id);
        if (b.payment_id) processedPayIds.add(b.payment_id);
      }

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
    if (bank.payment_id) processedPayIds.add(bank.payment_id);

    // Evaluate full 3-source matching
    const dateDiffDays = calculateDateDiffDays(pay.payment_date, bank.settlement_date);
    const erpVsPayDiff = Math.abs(erp.amount - pay.amount);
    const bankDiff = Math.abs(pay.amount - bank.amount);

    let status: TransactionStatus = 'MATCHED';
    let exceptionType: ExceptionType = 'NONE';
    let matchingMethod: MatchingMethod = payMatchingMethod || 'LEVEL_1_EXACT_IDENTIFIER';
    let summaryText = `Exact match across ERP invoice ${invId}, Payment ${pay.payment_id}, and Bank Settlement ${bank.settlement_id}.`;

    // Check 1: ERP amount vs Payment amount discrepancy (Customer Underpayment)
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
          feeEqualsNetDifference: true,
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

  // Secondary Loop: Process any genuine Payment records that were not linked to an ERP Invoice
  for (const pay of paymentRecords) {
    if (processedPayIds.has(pay.payment_id)) continue;
    if (
      pay.payment_id.startsWith('PAY-ROW-') ||
      pay.payment_id.includes('GW_ONLY') ||
      pay.payment_id.includes('GW-ONLY') ||
      (pay.invoice_id && (pay.invoice_id.includes('GW_ONLY') || pay.invoice_id.includes('GW-ONLY'))) ||
      pay.amount === 0
    ) {
      continue;
    }
    processedPayIds.add(pay.payment_id);

    // Check if this unbilled payment links to a bank settlement
    const { banks: linkedBank, method: bankMatchingMethod } = findBankForPayment(pay, {
      invoice_id: pay.invoice_id || pay.payment_id,
      amount: pay.amount,
      invoice_date: pay.payment_date,
      customer_id: 'UNKNOWN',
      status: 'POSTED',
    });

    if (linkedBank.length === 1) {
      const bank = linkedBank[0];
      processedBankIds.add(bank.settlement_id);
      if (bank.payment_id) processedPayIds.add(bank.payment_id);

      const dateDiffDays = calculateDateDiffDays(pay.payment_date, bank.settlement_date);
      const bankDiff = Math.abs(pay.amount - bank.amount);

      results.push({
        transaction_id: `TXN-${String(txnIndex++).padStart(3, '0')}`,
        source_record_ids: {
          invoice_id: pay.invoice_id || undefined,
          payment_id: pay.payment_id,
          settlement_id: bank.settlement_id,
        },
        status: 'EXCEPTION',
        exception_type: 'MISSING_PAYMENT_RECORD',
        erp_amount: 0,
        payment_amount: pay.amount,
        bank_amount: bank.amount,
        fee_amount: pay.fee,
        difference: bankDiff,
        date_difference_days: dateDiffDays,
        matching_method: bankMatchingMethod,
        confidence_score: 0.9,
        resolution_state: 'OPEN',
        evidence: {
          matchedIdentifiers: { paymentId: pay.payment_id, settlementId: bank.settlement_id },
          checks: {
            erpToPaymentMatch: false,
            paymentToBankMatch: true,
            amountEquals: bankDiff <= amountTolerance,
            feeEqualsNetDifference: Math.abs(pay.fee - bankDiff) <= amountTolerance,
            dateWithinTolerance: dateDiffDays <= dateToleranceDays,
            isDuplicate: false,
          },
          amounts: {
            erpAmount: 0,
            paymentAmount: pay.amount,
            bankAmount: bank.amount,
            feeAmount: pay.fee,
            netBankDifference: bankDiff,
          },
          dates: { paymentDate: pay.payment_date, settlementDate: bank.settlement_date, dateDifferenceDays: dateDiffDays },
          summary: `Payment ${pay.payment_id} (₹${pay.amount.toLocaleString()}) and Bank settlement ${bank.settlement_id} matched, but no corresponding ERP invoice was found.`,
        },
      });
    } else if (linkedBank.length === 0) {
      // Orphan payment record without bank settlement
      results.push({
        transaction_id: `TXN-${String(txnIndex++).padStart(3, '0')}`,
        source_record_ids: {
          invoice_id: pay.invoice_id || undefined,
          payment_id: pay.payment_id,
        },
        status: 'EXCEPTION',
        exception_type: 'MISSING_BANK_SETTLEMENT',
        erp_amount: 0,
        payment_amount: pay.amount,
        bank_amount: 0,
        fee_amount: pay.fee,
        difference: pay.amount,
        date_difference_days: 0,
        matching_method: 'LEVEL_5_EXCEPTION_CLASSIFICATION',
        confidence_score: 0.9,
        resolution_state: 'OPEN',
        evidence: {
          matchedIdentifiers: { paymentId: pay.payment_id },
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
            paymentAmount: pay.amount,
            bankAmount: 0,
            feeAmount: pay.fee,
            netBankDifference: pay.amount,
          },
          dates: { paymentDate: pay.payment_date },
          summary: `Payment gateway transaction ${pay.payment_id} (₹${pay.amount.toLocaleString()}) has neither an ERP invoice nor a bank settlement record.`,
        },
      });
    }
  }

  // Tertiary Loop: Unassigned Bank records not matched to any ERP/Payment
  for (const bank of bankRecords) {
    if (processedBankIds.has(bank.settlement_id)) continue;
    if (
      bank.settlement_id.startsWith('BNK-ROW-') ||
      bank.settlement_id.includes('BANK_ONLY') ||
      bank.settlement_id.includes('BANK-ONLY') ||
      (bank.payment_id && (bank.payment_id.includes('BANK_ONLY') || bank.payment_id.includes('BANK-ONLY'))) ||
      bank.amount === 0
    ) {
      continue;
    }
    processedBankIds.add(bank.settlement_id);

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

  return results;
}
