const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSettled() {
  try {
    const runId = 'RUN-1787934451177';
    console.log(`--- Checking bank settlement IDs for run ${runId} ---`);
    const count = await prisma.reconciledTransaction.count({
      where: {
        runId,
        settlementId: { not: null }
      }
    });

    console.log(`Transactions with non-null settlementId:`, count);

    // Let's print some details if there are any
    if (count > 0) {
      const txs = await prisma.reconciledTransaction.findMany({
        where: { runId, settlementId: { not: null } },
        take: 5
      });
      txs.forEach(t => {
        console.log(`  Txn ID: ${t.transactionId} | settlementId: ${t.settlementId} | bankAmount: ₹${t.bankAmount}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSettled();
