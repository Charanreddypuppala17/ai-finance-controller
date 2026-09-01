const { prisma } = require('../lib/db/prisma');

async function inspectRun() {
  const runId = 'RUN-1787939627981';
  const run = await prisma.reconciliationRun.findUnique({
    where: { id: runId }
  });

  if (!run) {
    console.error('Run not found!');
    return;
  }

  console.log(`\n--- Run Details: ${run.name} (${run.id}) ---`);
  console.log('Total Records:', run.totalRecords);
  console.log('Matched Records:', run.matchedRecords);
  console.log('Exception Count:', run.exceptionCount);
  console.log('Match Rate:', run.matchRate);

  // Group by Exception Type
  const txns = await prisma.reconciledTransaction.findMany({
    where: { runId }
  });

  const breakdown = {};
  txns.forEach(t => {
    breakdown[t.exceptionType] = (breakdown[t.exceptionType] || 0) + 1;
  });
  console.log('\n--- Exceptions Breakdown ---', breakdown);

  const timingLags = txns.filter(t => t.exceptionType === 'TIMING_LAG');
  console.log(`\n--- Timing Lag Exceptions (Total: ${timingLags.length}) ---`);
  timingLags.forEach((t, i) => {
    let evidence = {};
    try {
      evidence = JSON.parse(t.evidenceJson);
    } catch(e) {}
    console.log(`\n[${i+1}] TxnID: ${t.transactionId} | Status: ${t.status}`);
    console.log(`Invoice ID: ${t.invoiceId} | Payment ID: ${t.paymentId} | Settlement ID: ${t.settlementId}`);
    console.log(`ERP Amount: ${t.erpAmount} | Payment Amount: ${t.paymentAmount} | Bank Amount: ${t.bankAmount}`);
    console.log(`Date Diff Days: ${t.dateDifferenceDays}`);
    console.log(`Evidence Summary:`, evidence.summary);
  });
}

inspectRun().catch(console.error);
