import { prisma } from '../lib/db/prisma';

async function main() {
  const run = await prisma.reconciliationRun.findUnique({
    where: { id: 'RUN-1788682986377' },
    include: {
      transactions: {
        take: 10,
      }
    }
  });

  if (!run) {
    console.log('Run RUN-1788682986377 not found in DB');
    const allRuns = await prisma.reconciliationRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    console.log('All recent runs:', allRuns);
    return;
  }

  console.log('Found Run:', {
    id: run.id,
    name: run.name,
    totalRecords: run.totalRecords,
    matchedRecords: run.matchedRecords,
    exceptionCount: run.exceptionCount,
    matchRate: run.matchRate,
  });

  console.log('Sample 10 transactions:');
  for (const t of run.transactions) {
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
      method: t.matchingMethod,
      diff: t.difference,
      evidence: t.evidenceJson ? JSON.parse(t.evidenceJson)?.summary : undefined,
    });
  }

  const txnCount = await prisma.reconciledTransaction.count({
    where: { runId: 'RUN-1788682986377' }
  });
  console.log('Total txns in DB for this run:', txnCount);

  const bankAmountZeroCount = await prisma.reconciledTransaction.count({
    where: { runId: 'RUN-1788682986377', bankAmount: 0 }
  });
  console.log('Transactions with bankAmount === 0:', bankAmountZeroCount);

  const statusExceptionCount = await prisma.reconciledTransaction.count({
    where: { runId: 'RUN-1788682986377', status: 'EXCEPTION' }
  });
  console.log('Transactions with status === EXCEPTION:', statusExceptionCount);
}

main().catch(console.error).finally(() => prisma.$disconnect());
