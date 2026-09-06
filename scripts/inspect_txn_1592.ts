import { prisma } from '../lib/db/prisma';

async function main() {
  const t = await prisma.reconciledTransaction.findFirst({
    where: { runId: 'RUN-1788683955596', transactionId: 'TXN-1592' }
  });
  console.log('TXN-1592:', t);
}

main().catch(console.error).finally(() => prisma.$disconnect());
