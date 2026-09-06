import { prisma } from '../lib/db/prisma';

async function main() {
  const runId = 'RUN-1788683955596';
  const run = await prisma.reconciliationRun.findUnique({
    where: { id: runId },
    include: {
      transactions: {
        take: 20
      }
    }
  });

  if (!run) {
    console.log(`Run ${runId} not found`);
    const allRuns = await prisma.reconciliationRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    console.log('Recent runs:', allRuns);
    return;
  }

  console.log('Run info:', {
    id: run.id,
    name: run.name,
    totalRecords: run.totalRecords,
    matchedRecords: run.matchedRecords,
    exceptionCount: run.exceptionCount,
    matchRate: run.matchRate,
  });

  // Group by exceptionType
  const grouped = await prisma.reconciledTransaction.groupBy({
    by: ['status', 'exceptionType'],
    where: { runId },
    _count: { _all: true }
  });
  console.log('\nException breakdown in DB:', grouped);

  console.log('\nSample 10 transactions in this run:');
  for (const t of run.transactions.slice(0, 10)) {
    console.log({
      id: t.transactionId,
      inv: t.invoiceId,
      pay: t.paymentId,
      bank: t.settlementId,
      status: t.status,
      type: t.exceptionType,
      erpAmt: t.erpAmount,
      payAmt: t.paymentAmount,
      bankAmt: t.bankAmount,
      fee: t.feeAmount,
      diff: t.difference,
      days: t.dateDifferenceDays,
      method: t.matchingMethod,
      evidence: t.evidenceJson ? JSON.parse(t.evidenceJson) : undefined
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
