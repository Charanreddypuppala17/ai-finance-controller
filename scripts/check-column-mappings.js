const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMapping() {
  try {
    const runId = 'RUN-1787934451177';
    console.log(`--- Checking transaction mappings for run ${runId} ---`);
    
    // Fetch a transaction that was marked as DUPLICATE_PAYMENT
    const txs = await prisma.reconciledTransaction.findMany({
      where: { runId, exceptionType: 'DUPLICATE_PAYMENT' },
      take: 5
    });

    console.log(`Duplicate payment exceptions detail:`);
    for (const t of txs) {
      console.log(`\nTxn ID: ${t.transactionId}`);
      console.log(`  invoiceId: ${t.invoiceId}`);
      console.log(`  paymentId: ${t.paymentId}`);
      console.log(`  ERP Amount: ₹${t.erpAmount} | Payment Amount: ₹${t.paymentAmount} | Bank Amount: ₹${t.bankAmount}`);
      console.log(`  matchingMethod: ${t.matchingMethod} | confidence: ${t.confidenceScore}`);
    }

    // Let's also check the count of distinct invoiceIds in transactions
    const allTxs = await prisma.reconciledTransaction.findMany({
      where: { runId }
    });

    const invoiceIds = allTxs.map(t => t.invoiceId).filter(Boolean);
    const paymentIds = allTxs.map(t => t.paymentId).filter(Boolean);
    const uniqueInvoices = new Set(invoiceIds);
    const uniquePayments = new Set(paymentIds);

    console.log(`\nStatistics:`);
    console.log(`  Total transactions in run:`, allTxs.length);
    console.log(`  Total invoice IDs present:`, invoiceIds.length, `(Unique: ${uniqueInvoices.size})`);
    console.log(`  Total payment IDs present:`, paymentIds.length, `(Unique: ${uniquePayments.size})`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMapping();
