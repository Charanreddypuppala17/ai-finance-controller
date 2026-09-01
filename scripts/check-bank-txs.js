const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBankTxs() {
  try {
    const runId = 'RUN-1787934451177';
    console.log(`--- Checking bank transactions for run ${runId} ---`);
    const txs = await prisma.reconciledTransaction.findMany({
      where: { runId, bankAmount: { gt: 0 } }
    });

    console.log(`Found ${txs.length} transactions with bank records:`);
    txs.forEach((t, i) => {
      console.log(`\nBank Txn #${i+1}:`);
      console.log(`  ID: ${t.transactionId}`);
      console.log(`  Invoice ID: ${t.invoiceId} | Payment ID: ${t.paymentId} | Settlement ID: ${t.settlementId}`);
      console.log(`  ERP: ₹${t.erpAmount} | Payment: ₹${t.paymentAmount} | Bank: ₹${t.bankAmount}`);
      console.log(`  Status: ${t.status} | Exception Type: ${t.exceptionType}`);
      console.log(`  Matching Method: ${t.matchingMethod} | Confidence: ${t.confidenceScore}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBankTxs();
