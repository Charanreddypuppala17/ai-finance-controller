import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = req.headers.get('x-user-id') || 'demo-user-001';
    const runId = searchParams.get('runId') || undefined;
    const status = searchParams.get('status') || undefined;
    const exceptionType = searchParams.get('exceptionType') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const whereClause: any = {
      userId,
      ...(runId ? { runId } : {}),
      ...(status && status !== 'ALL' ? { status } : {}),
      ...(exceptionType && exceptionType !== 'ALL' ? { exceptionType } : {}),
    };

    if (search) {
      const term = search.trim();
      whereClause.OR = [
        { transactionId: { contains: term } },
        { invoiceId: { contains: term } },
        { paymentId: { contains: term } },
        { settlementId: { contains: term } },
      ];
    }

    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const allowedSortFields = ['transactionId', 'difference', 'createdAt'];
    const actualSortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const actualSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, transactions] = await Promise.all([
      prisma.reconciledTransaction.count({ where: whereClause }),
      prisma.reconciledTransaction.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [actualSortField]: actualSortOrder },
      })
    ]);

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
