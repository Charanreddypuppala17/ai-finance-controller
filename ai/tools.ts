import { prisma } from '../lib/db/prisma';

export async function getReconciliationSummaryTool(userId: string, runId?: string) {
  const targetRun = runId
    ? await prisma.reconciliationRun.findFirst({ where: { id: runId, userId } })
    : await prisma.reconciliationRun.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });

  if (!targetRun) {
    return { error: 'No reconciliation run found for this user.' };
  }

  const transactions = await prisma.reconciledTransaction.findMany({
    where: { userId, runId: targetRun.id },
  });

  const breakdown: Record<string, number> = {};
  for (const t of transactions) {
    breakdown[t.exceptionType] = (breakdown[t.exceptionType] || 0) + 1;
  }

  return {
    runId: targetRun.id,
    runName: targetRun.name,
    status: targetRun.status,
    totalRecords: targetRun.totalRecords,
    matchedRecords: targetRun.matchedRecords,
    exceptionCount: targetRun.exceptionCount,
    matchRate: targetRun.matchRate,
    exceptionBreakdown: breakdown,
    createdAt: targetRun.createdAt.toISOString(),
  };
}

export async function getTransactionTool(userId: string, runId: string | undefined, query: string) {
  const cleanQuery = query.trim().toUpperCase();
  
  // Find transaction matching transactionId, invoiceId, paymentId, or settlementId
  const transaction = await prisma.reconciledTransaction.findFirst({
    where: {
      userId,
      ...(runId ? { runId } : {}),
      OR: [
        { transactionId: { equals: cleanQuery } },
        { invoiceId: { equals: cleanQuery } },
        { paymentId: { equals: cleanQuery } },
        { settlementId: { equals: cleanQuery } },
        // Fallback for query matching TXN-017 or 17
        { transactionId: { contains: cleanQuery } },
        { invoiceId: { contains: cleanQuery } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!transaction) {
    return { error: `No transaction found matching query '${query}'.` };
  }

  let evidence = null;
  try {
    evidence = JSON.parse(transaction.evidenceJson);
  } catch (e) {
    evidence = transaction.evidenceJson;
  }

  return {
    transactionId: transaction.transactionId,
    status: transaction.status,
    exceptionType: transaction.exceptionType,
    invoiceId: transaction.invoiceId,
    paymentId: transaction.paymentId,
    settlementId: transaction.settlementId,
    erpAmount: transaction.erpAmount,
    paymentAmount: transaction.paymentAmount,
    bankAmount: transaction.bankAmount,
    feeAmount: transaction.feeAmount,
    difference: transaction.difference,
    dateDifferenceDays: transaction.dateDifferenceDays,
    matchingMethod: transaction.matchingMethod,
    resolutionState: transaction.resolutionState,
    evidence,
  };
}

export async function getExceptionsTool(userId: string, runId?: string, exceptionType?: string) {
  const whereClause: any = {
    userId,
    status: 'EXCEPTION',
    ...(runId ? { runId } : {}),
  };

  if (exceptionType && exceptionType !== 'ALL') {
    whereClause.exceptionType = exceptionType.toUpperCase();
  }

  const exceptions = await prisma.reconciledTransaction.findMany({
    where: whereClause,
    take: 20,
    orderBy: { difference: 'desc' },
  });

  return exceptions.map(t => {
    let evidenceSummary = '';
    try {
      const parsed = JSON.parse(t.evidenceJson);
      evidenceSummary = parsed.summary || '';
    } catch (e) {}

    return {
      transactionId: t.transactionId,
      invoiceId: t.invoiceId,
      exceptionType: t.exceptionType,
      erpAmount: t.erpAmount,
      paymentAmount: t.paymentAmount,
      bankAmount: t.bankAmount,
      difference: t.difference,
      evidenceSummary,
    };
  });
}

export async function searchTransactionsTool(userId: string, runId?: string, searchTerm?: string) {
  if (!searchTerm) {
    return [];
  }

  const term = searchTerm.trim();
  const numericTerm = parseFloat(term);

  const transactions = await prisma.reconciledTransaction.findMany({
    where: {
      userId,
      ...(runId ? { runId } : {}),
      OR: [
        { transactionId: { contains: term } },
        { invoiceId: { contains: term } },
        { paymentId: { contains: term } },
        { settlementId: { contains: term } },
        { status: { contains: term.toUpperCase() } },
        { exceptionType: { contains: term.toUpperCase() } },
        ...(isNaN(numericTerm)
          ? []
          : [{ erpAmount: numericTerm }, { paymentAmount: numericTerm }, { bankAmount: numericTerm }]),
      ],
    },
    take: 15,
  });

  return transactions.map(t => ({
    transactionId: t.transactionId,
    invoiceId: t.invoiceId,
    status: t.status,
    exceptionType: t.exceptionType,
    erpAmount: t.erpAmount,
    paymentAmount: t.paymentAmount,
    bankAmount: t.bankAmount,
    difference: t.difference,
  }));
}
