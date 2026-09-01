import { ErpRecord, PaymentRecord, BankRecord } from './types';

export interface ReconciliationIndexes {
  erpByInvoiceId: Map<string, ErpRecord>;
  paymentsByInvoiceId: Map<string, PaymentRecord[]>;
  paymentsByPaymentId: Map<string, PaymentRecord>;
  bankByPaymentId: Map<string, BankRecord[]>;
  bankBySettlementId: Map<string, BankRecord>;
}

export function buildReconciliationIndexes(
  erpRecords: ErpRecord[],
  paymentRecords: PaymentRecord[],
  bankRecords: BankRecord[]
): ReconciliationIndexes {
  const erpByInvoiceId = new Map<string, ErpRecord>();
  const paymentsByInvoiceId = new Map<string, PaymentRecord[]>();
  const paymentsByPaymentId = new Map<string, PaymentRecord>();
  const bankByPaymentId = new Map<string, BankRecord[]>();
  const bankBySettlementId = new Map<string, BankRecord>();

  for (const erp of erpRecords) {
    erpByInvoiceId.set(erp.invoice_id, erp);
  }

  for (const pay of paymentRecords) {
    paymentsByPaymentId.set(pay.payment_id, pay);
    const existing = paymentsByInvoiceId.get(pay.invoice_id) || [];
    existing.push(pay);
    paymentsByInvoiceId.set(pay.invoice_id, existing);
  }

  for (const bank of bankRecords) {
    bankBySettlementId.set(bank.settlement_id, bank);
    const existing = bankByPaymentId.get(bank.payment_id) || [];
    existing.push(bank);
    bankByPaymentId.set(bank.payment_id, existing);
  }

  return {
    erpByInvoiceId,
    paymentsByInvoiceId,
    paymentsByPaymentId,
    bankByPaymentId,
    bankBySettlementId,
  };
}
