import { prisma } from '../lib/db/prisma';

async function main() {
  const txns = await prisma.reconciledTransaction.findMany({
    where: { runId: 'RUN-1788683955596' },
    take: 20
  });

  console.log('--- Analyzing 20 txns with new logic ---');
  let matchCount = 0;
  let exceptionCount = 0;

  for (const t of txns) {
    const erpAmt = t.erpAmount;
    const payAmt = t.paymentAmount;
    const fee = t.feeAmount;
    const bankAmt = t.bankAmount;

    const erpVsPayDiff = Math.abs(erpAmt - payAmt);
    const bankDiff = Math.abs(payAmt - bankAmt);

    const isExactErp = erpVsPayDiff <= 0.05;
    const isNetPlusFeeErp = Math.abs(erpAmt - (payAmt + fee)) <= 0.05;
    const isExactBank = bankDiff <= 0.05;
    const isFeeDeductedBank = Math.abs((payAmt - fee) - bankAmt) <= 0.05;

    let status = 'MATCHED';
    let type = 'NONE';

    if (!isExactErp && !isNetPlusFeeErp) {
      status = 'EXCEPTION';
      type = 'AMOUNT_MISMATCH';
    } else if (t.dateDifferenceDays > 3) {
      status = 'EXCEPTION';
      type = 'TIMING_LAG';
    } else if (isExactErp && bankDiff > 0.05) {
      const isFeeMatch = Math.abs(fee - bankDiff) <= 0.05;
      if (isFeeMatch && fee > 0) {
        status = 'EXCEPTION';
        type = 'FEE_MISMATCH';
      } else {
        status = 'EXCEPTION';
        type = 'AMOUNT_MISMATCH';
      }
    } else if (isNetPlusFeeErp && !isExactBank) {
      status = 'EXCEPTION';
      type = 'AMOUNT_MISMATCH';
    }

    if (status === 'MATCHED') matchCount++;
    else exceptionCount++;

    console.log(`[${t.transactionId}] ERP: ${erpAmt} | Pay: ${payAmt} (Fee: ${fee}) | Bank: ${bankAmt} | Days: ${t.dateDifferenceDays} => Status: ${status}, Type: ${type}`);
  }

  console.log(`\nSample result: ${matchCount} MATCHED, ${exceptionCount} EXCEPTIONS`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
