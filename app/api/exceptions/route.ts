import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = req.headers.get('x-user-id') || 'demo-user-001';
    const runId = searchParams.get('runId') || undefined;

    const exceptions = await prisma.reconciledTransaction.findMany({
      where: {
        userId,
        status: 'EXCEPTION',
        ...(runId ? { runId } : {}),
      },
      orderBy: { difference: 'desc' },
    });

    const categoryCounts: Record<string, number> = {};
    for (const item of exceptions) {
      categoryCounts[item.exceptionType] = (categoryCounts[item.exceptionType] || 0) + 1;
    }

    return NextResponse.json({
      exceptions,
      categoryCounts,
      totalExceptions: exceptions.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
