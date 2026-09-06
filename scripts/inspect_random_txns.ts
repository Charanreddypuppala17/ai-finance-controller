import { prisma } from '../lib/db/prisma';

async function main() {
  const txns = await prisma.reconciledTransaction.findMany({
    where: { runId: 'RUN-1788683955596' },
    skip: 100,
    take: 10
  });

  console.log('10 transactions from row 100+:');
  for (const t of txns) {
    console.log({
      id: t.transactionId,
      inv: t.invoiceId,
      pay: t.paymentId,
      bank: t.settlementId,
      erp: t.erpAmount,
      pay: t.paymentAmount,
      fee: t.feeAmount,
      bank: t.bankAmount,
      evidence: t.evidenceJson ? JSON.parse(t.evidenceJson) : null
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
