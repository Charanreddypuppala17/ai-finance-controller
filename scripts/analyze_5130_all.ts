import { prisma } from '../lib/db/prisma';

async function main() {
  const runId = 'RUN-1788683955596';
  const allTxns = await prisma.reconciledTransaction.findMany({
    where: { runId },
  });

  console.log(`Total transactions in RUN-1788683955596: ${allTxns.length}`);

  let totalMatched = 0;
  let totalExceptions = 0;

  const categoryCounts: Record<string, number> = {};

  for (const t of allTxns) {
    const erpAmt = t.erpAmount;
    const payAmt = t.paymentAmount;
    const fee = t.feeAmount;
    const bankAmt = t.bankAmount;

    const erpVsPayDiff = Math.abs(erpAmt - payAmt);
    const bankDiff = Math.abs(payAmt - bankAmt);

    // Format A (Gross pay): pay == erp, bank == pay - fee
    // Format B (Net pay): pay + fee == erp, bank == pay
    // Format C (Exact equal): erp == pay == bank
    const isGrossErp = erpVsPayDiff <= 0.05;
    const isNetErp = Math.abs(erpAmt - (payAmt + fee)) <= 0.05;

    const isExactBank = bankDiff <= 0.05;
    const isFeeDeductedBank = Math.abs((payAmt - fee) - bankAmt) <= 0.05;

    let status = 'MATCHED';
    let type = 'NONE';

    if (erpAmt === 0 && payAmt === 0 && bankAmt > 0) {
      status = 'EXCEPTION';
      type = 'UNASSIGNED_BANK_SETTLEMENT';
    } else if (erpAmt === 0 && payAmt > 0) {
      status = 'EXCEPTION';
      type = 'MISSING_PAYMENT_RECORD';
    } else if (payAmt === 0 && bankAmt === 0 && erpAmt > 0) {
      status = 'EXCEPTION';
      type = 'MISSING_PAYMENT_RECORD';
    } else if (!isGrossErp && !isNetErp) {
      status = 'EXCEPTION';
      type = 'AMOUNT_MISMATCH';
    } else if (isGrossErp && bankDiff > 0.05 && !isFeeDeductedBank) {
      status = 'EXCEPTION';
      type = 'AMOUNT_MISMATCH';
    } else if (isNetErp && !isExactBank) {
      status = 'EXCEPTION';
      type = 'AMOUNT_MISMATCH';
    } else if (t.dateDifferenceDays > 3) {
      status = 'EXCEPTION';
      type = 'TIMING_LAG';
    }

    if (status === 'MATCHED') {
      totalMatched++;
    } else {
      totalExceptions++;
    }

    categoryCounts[type] = (categoryCounts[type] || 0) + 1;
  }

  console.log('\n=== REAL RECONCILIATION RESULT WITH BALANCED GROSS/NET LOGIC ===');
  console.log(`Total Records: ${allTxns.length}`);
  console.log(`Matched Records: ${totalMatched} (${((totalMatched / allTxns.length) * 100).toFixed(1)}%)`);
  console.log(`Exceptions: ${totalExceptions} (${((totalExceptions / allTxns.length) * 100).toFixed(1)}%)`);
  console.log('\nBreakdown:', categoryCounts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
