import { describe, it, expect } from 'vitest';
import { reconcileDatasets } from '../../reconciliation/reconcile';
import { parseCsvString } from '../../reconciliation/parser';
import { parseCleanAmount, parseCleanDate, extractCoreIdentifier } from '../../reconciliation/normalizer';

describe('Reconciliation Engine Robustness & Edge Cases', () => {
  it('correctly handles UTF-8 BOM in CSV headers', () => {
    const erpWithBom = '\uFEFFinvoice_id,customer_id,amount,invoice_date,status\nINV-001,CUST-1,1000,2026-08-01,POSTED';
    const payWithBom = '\uFEFFpayment_id,invoice_id,amount,payment_date,fee,status\nPAY-001,INV-001,1000,2026-08-02,0,SUCCESS';
    const bankWithBom = '\uFEFFsettlement_id,payment_id,amount,settlement_date,status\nSET-001,PAY-001,1000,2026-08-03,SETTLED';

    const output = reconcileDatasets(erpWithBom, payWithBom, bankWithBom);
    expect(output.summary.totalRecords).toBe(1);
    expect(output.summary.matchedRecords).toBe(1);
    expect(output.transactions[0].status).toBe('MATCHED');
    expect(output.transactions[0].erp_amount).toBe(1000);
  });

  it('correctly parses formatted currency amounts with symbols and commas', () => {
    expect(parseCleanAmount('₹64,348.60')).toBe(64348.6);
    expect(parseCleanAmount('$1,250.00')).toBe(1250);
    expect(parseCleanAmount('50,000.00')).toBe(50000);
    expect(parseCleanAmount('(500.25)')).toBe(-500.25);
    expect(parseCleanAmount(' € 9,999.99 ')).toBe(9999.99);

    const erpCsv = `invoice_id,customer_id,amount,invoice_date,status\nINV-001,CUST-1,"₹64,348.60",2026-08-01,POSTED`;
    const payCsv = `payment_id,invoice_id,amount,payment_date,fee,status\nPAY-001,INV-001,"₹64,348.60",2026-08-02,"₹0.00",SUCCESS`;
    const bankCsv = `settlement_id,payment_id,amount,settlement_date,status\nSET-001,PAY-001,"₹64,348.60",2026-08-03,SETTLED`;

    const output = reconcileDatasets(erpCsv, payCsv, bankCsv);
    expect(output.summary.totalRecords).toBe(1);
    expect(output.summary.matchedRecords).toBe(1);
    expect(output.transactions[0].erp_amount).toBe(64348.6);
    expect(output.transactions[0].payment_amount).toBe(64348.6);
    expect(output.transactions[0].bank_amount).toBe(64348.6);
  });

  it('correctly matches cross-referenced IDs with different prefixes (ERP-TXN, GW-TXN, BNK-TXN)', () => {
    const erpCsv = `transaction_id,customer_id,amount,transaction_date,erp_reference\nTXN00305,CUST1119,57256.73,2026-08-03 11:33:00,ERP-TXN00305`;
    const payCsv = `transaction_id,customer_id,amount,transaction_date,gateway_reference,gateway_fee\nTXN00305,CUST1119,57256.73,2026-08-03 11:33:00,GW-TXN00305,1032.87`;
    const bankCsv = `transaction_id,customer_id,amount,transaction_date,bank_reference,credit_amount\nTXN00305,CUST1119,56223.86,2026-08-04 11:33:00,BNK-TXN00305,56223.86`;

    const output = reconcileDatasets(erpCsv, payCsv, bankCsv);
    expect(output.summary.totalRecords).toBe(1);
    expect(output.transactions[0].erp_amount).toBe(57256.73);
    expect(output.transactions[0].payment_amount).toBe(57256.73);
    expect(output.transactions[0].bank_amount).toBe(56223.86);
    expect(output.transactions[0].fee_amount).toBe(1032.87);
    expect(output.transactions[0].status).toBe('EXCEPTION');
    expect(output.transactions[0].exception_type).toBe('FEE_MISMATCH');
  });

  it('extracts core alphanumeric identifiers correctly', () => {
    expect(extractCoreIdentifier('GW-TXN00305')).toBe('00305');
    expect(extractCoreIdentifier('BNK-TXN00305')).toBe('00305');
    expect(extractCoreIdentifier('INV-1001')).toBe('1001');
    expect(extractCoreIdentifier('PAY-1001')).toBe('1001');
    expect(extractCoreIdentifier('SET-1001-DUP')).toBe('1001');
  });

  it('auto-detects and corrects swapped CSV inputs', () => {
    const erpCsv = `invoice_id,customer_id,amount,invoice_date,status\nINV-001,CUST-1,1000,2026-08-01,POSTED`;
    const payCsv = `payment_id,invoice_id,amount,payment_date,fee,status\nPAY-001,INV-001,1000,2026-08-02,0,SUCCESS`;
    const bankCsv = `settlement_id,payment_id,amount,settlement_date,status\nSET-001,PAY-001,1000,2026-08-03,SETTLED`;

    // Pass bankCsv as ERP and erpCsv as Bank
    const output = reconcileDatasets(bankCsv, payCsv, erpCsv);
    expect(output.summary.totalRecords).toBe(1);
    expect(output.summary.matchedRecords).toBe(1);
  });
});
