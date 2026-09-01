import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user-001';
    const runId = params.id;

    const run = await prisma.reconciliationRun.findFirst({
      where: { id: runId, userId },
    });

    if (!run) {
      return NextResponse.json({ error: 'Reconciliation run not found' }, { status: 404 });
    }

    const [transactions, auditLogs] = await Promise.all([
      prisma.reconciledTransaction.findMany({
        where: { runId, userId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.auditLog.findMany({
        where: { runId, userId },
        orderBy: { timestamp: 'desc' },
      })
    ]);

    return NextResponse.json({
      run,
      transactions,
      auditLogs,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
