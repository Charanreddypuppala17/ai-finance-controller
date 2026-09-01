const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    console.log('--- Checking registered Users ---');
    const users = await prisma.user.findMany();
    console.log('Users found:', users.map(u => ({ id: u.id, email: u.email, name: u.name })));

    console.log('\n--- Checking Reconciliation Runs ---');
    const runs = await prisma.reconciliationRun.findMany();
    console.log('Runs found:', runs.map(r => ({ id: r.id, userId: r.userId, name: r.name, totalRecords: r.totalRecords, createdAt: r.createdAt })));

    console.log('\n--- Checking Reconciled Transactions ---');
    const txCount = await prisma.reconciledTransaction.count();
    console.log('Total transaction records in database:', txCount);

  } catch (error) {
    console.error('Database query error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
