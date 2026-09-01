const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDetails() {
  try {
    const runId = 'RUN-1787934451177';
    console.log(`--- Checking Reconciled Transactions for run ${runId} ---`);
    const txs = await prisma.reconciledTransaction.findMany({
      where: { runId },
      take: 15
    });

    txs.forEach((t, i) => {
      console.log(`\nTxn #${i+1}:`);
      console.log(`  ID: ${t.transactionId}`);
      console.log(`  Invoice ID: ${t.invoiceId}`);
      console.log(`  Payment ID: ${t.paymentId}`);
      console.log(`  Settlement ID: ${t.settlementId}`);
      console.log(`  ERP Amt: ₹${t.erpAmount} | Payment Amt: ₹${t.paymentAmount} | Bank Amt: ₹${t.bankAmount}`);
      console.log(`  Status: ${t.status} | Exception Type: ${t.exceptionType}`);
      console.log(`  Difference: ₹${t.difference} | Confidence: ${t.confidenceScore}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDetails();
