import { prisma } from '../lib/db/prisma';

async function main() {
  const t = await prisma.reconciledTransaction.findFirst({
    where: { runId: 'RUN-1788683955596', invoiceId: 'ORD0002828' }
  });
  console.log('ORD0002828:', t);

  // Check how many bank records matched by exact identifier vs fallback
  const methods = await prisma.reconciledTransaction.groupBy({
    by: ['matchingMethod'],
    where: { runId: 'RUN-1788683955596' },
    _count: { _all: true }
  });
  console.log('\nMatching methods in 5130 run:', methods);
}

main().catch(console.error).finally(() => prisma.$disconnect());
