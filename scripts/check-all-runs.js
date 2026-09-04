const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const runs = await prisma.reconciliationRun.findMany({
    orderBy: { createdAt: 'desc' }
  });
  console.log('All runs:');
  for (const r of runs) {
    const txCount = await prisma.reconciledTransaction.count({ where: { runId: r.id } });
    const erpCount = await prisma.reconciledTransaction.count({ where: { runId: r.id, erpAmount: { gt: 0 } } });
    const payCount = await prisma.reconciledTransaction.count({ where: { runId: r.id, paymentAmount: { gt: 0 } } });
    const bnkCount = await prisma.reconciledTransaction.count({ where: { runId: r.id, bankAmount: { gt: 0 } } });
    console.log(`Run ${r.id} (${r.name}): total=${r.totalRecords}, matched=${r.matchedRecords}, exceptions=${r.exceptionCount}, ERP=${erpCount}, PAY=${payCount}, BNK=${bnkCount}`);
  }
}

main().finally(() => prisma.$disconnect());
