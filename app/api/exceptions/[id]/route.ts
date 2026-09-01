import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-user-001';
    const { resolutionState, notes } = await req.json();

    const transaction = await prisma.reconciledTransaction.findFirst({
      where: { id: params.id, userId },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction record not found' }, { status: 404 });
    }

    const updated = await prisma.reconciledTransaction.update({
      where: { id: params.id },
      data: {
        resolutionState: resolutionState || 'RESOLVED',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        runId: transaction.runId,
        action: 'EXCEPTION_RESOLUTION_UPDATED',
        details: `Updated exception ${transaction.transactionId} resolution state to ${resolutionState}. Notes: ${notes || 'None'}`,
      },
    });

    return NextResponse.json({ success: true, transaction: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
