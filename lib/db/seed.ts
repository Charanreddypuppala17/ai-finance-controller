import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { reconcileDatasets } from '../../reconciliation/reconcile';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding AI Finance Controller database...');

  // Create or upsert Demo User
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@aifinance.com' },
    update: {
      name: 'Demo Financial Judge',
    },
    create: {
      id: 'demo-user-001',
      email: 'demo@aifinance.com',
      name: 'Demo Financial Judge',
      passwordHash: 'Demo@123', // In production use bcrypt
    },
  });

  console.log(`Demo User created/verified: ${demoUser.email} (${demoUser.id})`);

  // Load synthetic CSV datasets
  const erpPath = path.join(__dirname, '../../data/demo/erp.csv');
  const payPath = path.join(__dirname, '../../data/demo/payments.csv');
  const bankPath = path.join(__dirname, '../../data/demo/bank.csv');

  const erpCsv = fs.readFileSync(erpPath, 'utf8');
  const payCsv = fs.readFileSync(payPath, 'utf8');
  const bankCsv = fs.readFileSync(bankPath, 'utf8');

  // Run reconciliation engine
  const runId = 'DEMO-RUN-001';
  const output = reconcileDatasets(erpCsv, payCsv, bankCsv, {}, runId);

  // Clean existing demo runs if re-seeding
  await prisma.reconciliationRun.deleteMany({ where: { userId: demoUser.id } });

  // Create Reconciliation Run record
  const runRecord = await prisma.reconciliationRun.create({
    data: {
      id: runId,
      userId: demoUser.id,
      name: 'Multi-Source Demo Reconciliation (ERP + Gateway + Bank)',
      status: 'COMPLETED',
      totalRecords: output.summary.totalRecords,
      matchedRecords: output.summary.matchedRecords,
      exceptionCount: output.summary.exceptionCount,
      matchRate: output.summary.matchRate,
    },
  });

  console.log(`Reconciliation Run created: ${runRecord.id} (Match Rate: ${runRecord.matchRate}%)`);

  // Create Reconciled Transaction records
  const transactionData = output.transactions.map(t => ({
    transactionId: t.transaction_id,
    runId: runRecord.id,
    userId: demoUser.id,
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

  await prisma.reconciledTransaction.createMany({
    data: transactionData,
  });

  // Create Audit Log
  await prisma.auditLog.create({
    data: {
      userId: demoUser.id,
      runId: runRecord.id,
      action: 'DEMO_RUN_INITIALIZED',
      details: `Preloaded synthetic demo reconciliation with ${output.summary.totalRecords} records (${output.summary.matchedRecords} matched, ${output.summary.exceptionCount} exceptions).`,
    },
  });

  console.log(`Successfully seeded ${transactionData.length} reconciled transactions into database!`);
}

main()
  .catch(e => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
