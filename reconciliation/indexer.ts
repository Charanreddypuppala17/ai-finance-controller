import { ErpRecord, PaymentRecord, BankRecord } from './types';
import { extractCoreIdentifier } from './normalizer';

export interface ReconciliationIndexes {
  erpByInvoiceId: Map<string, ErpRecord>;
  erpByCoreId: Map<string, ErpRecord>;
  paymentsByInvoiceId: Map<string, PaymentRecord[]>;
  paymentsByPaymentId: Map<string, PaymentRecord>;
  paymentsByCoreId: Map<string, PaymentRecord[]>;
  bankByPaymentId: Map<string, BankRecord[]>;
  bankBySettlementId: Map<string, BankRecord>;
  bankByCoreId: Map<string, BankRecord[]>;
}

export function buildReconciliationIndexes(
  erpRecords: ErpRecord[],
  paymentRecords: PaymentRecord[],
  bankRecords: BankRecord[]
): ReconciliationIndexes {
  const erpByInvoiceId = new Map<string, ErpRecord>();
  const erpByCoreId = new Map<string, ErpRecord>();
  const paymentsByInvoiceId = new Map<string, PaymentRecord[]>();
  const paymentsByPaymentId = new Map<string, PaymentRecord>();
  const paymentsByCoreId = new Map<string, PaymentRecord[]>();
  const bankByPaymentId = new Map<string, BankRecord[]>();
  const bankBySettlementId = new Map<string, BankRecord>();
  const bankByCoreId = new Map<string, BankRecord[]>();

  for (const erp of erpRecords) {
    erpByInvoiceId.set(erp.invoice_id, erp);
    const core = extractCoreIdentifier(erp.invoice_id);
    if (core) erpByCoreId.set(core, erp);
  }

  for (const pay of paymentRecords) {
    paymentsByPaymentId.set(pay.payment_id, pay);

    // Index by primary invoice_id
    const existingByInv = paymentsByInvoiceId.get(pay.invoice_id) || [];
    existingByInv.push(pay);
    paymentsByInvoiceId.set(pay.invoice_id, existingByInv);

    // Also index payment_id as invoice_id if different
    if (pay.payment_id !== pay.invoice_id) {
      const existingByPay = paymentsByInvoiceId.get(pay.payment_id) || [];
      if (!existingByPay.includes(pay)) {
        existingByPay.push(pay);
        paymentsByInvoiceId.set(pay.payment_id, existingByPay);
      }
    }

    // Core ID indexing
    const coreInv = extractCoreIdentifier(pay.invoice_id);
    const corePay = extractCoreIdentifier(pay.payment_id);
    if (coreInv) {
      const existingCore = paymentsByCoreId.get(coreInv) || [];
      if (!existingCore.includes(pay)) {
        existingCore.push(pay);
        paymentsByCoreId.set(coreInv, existingCore);
      }
    }
    if (corePay && corePay !== coreInv) {
      const existingCore = paymentsByCoreId.get(corePay) || [];
      if (!existingCore.includes(pay)) {
        existingCore.push(pay);
        paymentsByCoreId.set(corePay, existingCore);
      }
    }
  }

  for (const bank of bankRecords) {
    bankBySettlementId.set(bank.settlement_id, bank);

    // Index by payment_id
    const existingByPay = bankByPaymentId.get(bank.payment_id) || [];
    existingByPay.push(bank);
    bankByPaymentId.set(bank.payment_id, existingByPay);

    // Also index settlement_id as payment_id if different
    if (bank.settlement_id !== bank.payment_id) {
      const existingBySet = bankByPaymentId.get(bank.settlement_id) || [];
      if (!existingBySet.includes(bank)) {
        existingBySet.push(bank);
        bankByPaymentId.set(bank.settlement_id, existingBySet);
      }
    }

    // Core ID indexing
    const corePay = extractCoreIdentifier(bank.payment_id);
    const coreSet = extractCoreIdentifier(bank.settlement_id);
    if (corePay) {
      const existingCore = bankByCoreId.get(corePay) || [];
      if (!existingCore.includes(bank)) {
        existingCore.push(bank);
        bankByCoreId.set(corePay, existingCore);
      }
    }
    if (coreSet && coreSet !== corePay) {
      const existingCore = bankByCoreId.get(coreSet) || [];
      if (!existingCore.includes(bank)) {
        existingCore.push(bank);
        bankByCoreId.set(coreSet, existingCore);
      }
    }
  }

  return {
    erpByInvoiceId,
    erpByCoreId,
    paymentsByInvoiceId,
    paymentsByPaymentId,
    paymentsByCoreId,
    bankByPaymentId,
    bankBySettlementId,
    bankByCoreId,
  };
}
