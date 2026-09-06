import { prisma } from '../lib/db/prisma';

async function main() {
  const t = await prisma.reconciledTransaction.findFirst({
    where: { runId: 'RUN-1788682986377' }
  });
  console.log('First txn in RUN-1788682986377:', t);
}

main().catch(console.error).finally(() => prisma.$disconnect());
