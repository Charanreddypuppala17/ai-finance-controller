import { reconcileDatasets } from '../reconciliation/reconcile';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function create200Run() {
  const erpRows = ['invoice_id,customer_id,amount,invoice_date,status'];
  const payRows = ['payment_id,invoice_id,amount,payment_date,fee,status'];
  const bankRows = ['settlement_id,payment_id,amount,settlement_date,status'];

  for (let i = 1; i <= 200; i++) {
    const invId = 'INV-' + (10000 + i);
    const payId = 'GTW-' + (900000 + i);
    const utrId = 'UTR082000' + String(i).padStart(4, '0');
    const date = '2026-08-15';
    const amt = 10000 + i * 50;

    erpRows.push(invId + ',CUST-' + i + ',' + amt + ',' + date + ',POSTED');
    payRows.push(payId + ',' + invId + ',' + amt + ',' + date + ',0.00,SUCCESS');
    bankRows.push(utrId + ',' + payId + ',' + amt + ',' + date + ',SETTLED');
  }

  const runId = 'RUN-' + Date.now();
  const res = reconcileDatasets(erpRows.join('\n'), payRows.join('\n'), bankRows.join('\n'), {}, runId);
  console.log('Reconciliation result summary:', res.summary);

  const runRecord = await prisma.reconciliationRun.create({
    data: {
      id: runId,
      userId: 'demo-user-001',
      name: '200-Transaction Precision Verified Run',
      status: 'COMPLETED',
      totalRecords: res.summary.totalRecords,
      matchedRecords: res.summary.matchedRecords,
      exceptionCount: res.summary.exceptionCount,
      matchRate: res.summary.matchRate,
    }
  });

  const txData = res.transactions.map(t => ({
    transactionId: t.transaction_id,
    runId: runRecord.id,
    userId: 'demo-user-001',
    invoiceId: t.source_record_ids.invoice_id || null,
    paymentId: t.source_record_ids.payment_id || null,
    settlementId: t.source_record_ids.settlement_id || null,
    status: t.status,
    exceptionType: t.exception_type,
    erpAmount: t.erp_amount,
    paymentAmount: t.payment_amount,
    bankAmount: t.bank_amount,
    feeAmount: t.fee_amount,
    difference: t.difference,
    dateDifferenceDays: t.date_difference_days,
    matchingMethod: t.matching_method,
    evidenceJson: JSON.stringify(t.evidence),
    confidenceScore: t.confidence_score,
    resolutionState: t.resolution_state,
  }));

  await prisma.reconciledTransaction.createMany({ data: txData });
  console.log('Saved 200-transaction run to DB! Run ID:', runId);
}

create200Run().catch(console.error).finally(() => prisma.$disconnect());
