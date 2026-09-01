import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user-001';

    const rawRuns = await prisma.reconciliationRun.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Solve N+1 queries by grouping exceptions by runId
    const [unresolvedCountsGrouped, resolvedCountsGrouped] = await Promise.all([
      prisma.reconciledTransaction.groupBy({
        by: ['runId'],
        where: {
          userId,
          status: 'EXCEPTION',
          resolutionState: { not: 'RESOLVED' },
        },
        _count: { _all: true },
      }),
      prisma.reconciledTransaction.groupBy({
        by: ['runId'],
        where: {
          userId,
          status: 'EXCEPTION',
          resolutionState: 'RESOLVED',
        },
        _count: { _all: true },
      }),
    ]);

    const unresolvedMap = new Map(unresolvedCountsGrouped.map((item) => [item.runId, item._count._all]));
    const resolvedMap = new Map(resolvedCountsGrouped.map((item) => [item.runId, item._count._all]));

    const runs = rawRuns.map((run) => ({
      ...run,
      exceptionCount: unresolvedMap.get(run.id) || 0,
      resolvedCount: resolvedMap.get(run.id) || 0,
    }));

    let stats = null;
    const { searchParams } = new URL(req.url);
    const requestedRunId = searchParams.get('runId');
    const targetRun = (requestedRunId ? runs.find((r) => r.id === requestedRunId) : null) || runs[0];

    if (targetRun) {
      const [
        summaryStats,
        erpCount,
        paymentCount,
        bankCount,
        exceptions
      ] = await Promise.all([
        prisma.reconciledTransaction.groupBy({
          by: ['status', 'resolutionState'],
          where: { runId: targetRun.id },
          _sum: {
            erpAmount: true,
            paymentAmount: true,
            feeAmount: true,
            bankAmount: true,
            difference: true,
          },
          _count: { _all: true },
        }),
        prisma.reconciledTransaction.count({
          where: { runId: targetRun.id, erpAmount: { gt: 0 } },
        }),
        prisma.reconciledTransaction.count({
          where: { runId: targetRun.id, paymentAmount: { gt: 0 } },
        }),
        prisma.reconciledTransaction.count({
          where: { runId: targetRun.id, bankAmount: { gt: 0 } },
        }),
        prisma.reconciledTransaction.groupBy({
          by: ['exceptionType'],
          where: { 
            runId: targetRun.id, 
            status: 'EXCEPTION',
            resolutionState: { not: 'RESOLVED' }
          },
          _count: { _all: true },
        })
      ]);

      let erpSum = 0;
      let paymentSum = 0;
      let feeSum = 0;
      let bankSum = 0;
      let matchedSum = 0;
      let discrepancySum = 0;
      let resolvedSum = 0;
      let resolvedCount = 0;

      for (const row of summaryStats) {
        const erp = row._sum.erpAmount || 0;
        const payment = row._sum.paymentAmount || 0;
        const fee = row._sum.feeAmount || 0;
        const bank = row._sum.bankAmount || 0;
        const diff = row._sum.difference || 0;
        const count = row._count._all || 0;

        erpSum += erp;
        paymentSum += payment;
        feeSum += fee;
        bankSum += bank;

        if (row.status === 'MATCHED') {
          matchedSum += erp;
        } else if (row.status === 'EXCEPTION') {
          if (row.resolutionState === 'RESOLVED') {
            resolvedSum += diff;
            resolvedCount += count;
          } else {
            discrepancySum += diff;
          }
        }
      }

      stats = {
        erpCount,
        paymentCount,
        bankCount,
        erpSum,
        paymentSum,
        feeSum,
        bankSum,
        matchedSum,
        discrepancySum,
        resolvedSum,
        resolvedCount,
        exceptionsBreakdown: exceptions
          .filter(e => e.exceptionType !== null)
          .map(e => ({
            type: e.exceptionType,
            count: e._count._all,
          })),
      };
    }

    return NextResponse.json({ runs, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
