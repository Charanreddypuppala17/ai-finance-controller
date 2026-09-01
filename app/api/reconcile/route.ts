import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { reconcileDatasets } from '@/reconciliation/reconcile';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { erpCsv, paymentCsv, bankCsv, options, runName } = await req.json();
    const userId = req.headers.get('x-user-id') || 'demo-user-001';

    if (!erpCsv || !paymentCsv || !bankCsv) {
      return NextResponse.json(
        { error: 'Missing required source files (ERP, Payment, or Bank CSV).' },
        { status: 400 }
      );
    }

    // Save files for debugging
    try {
      const debugDir = path.join(process.cwd(), 'debug-uploads');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      fs.writeFileSync(path.join(debugDir, 'debug-erp.csv'), erpCsv, 'utf8');
      fs.writeFileSync(path.join(debugDir, 'debug-payment.csv'), paymentCsv, 'utf8');
      fs.writeFileSync(path.join(debugDir, 'debug-bank.csv'), bankCsv, 'utf8');
      console.log('Saved raw uploaded CSV files to debug-uploads/ for validation.');
    } catch (err) {
      console.error('Failed to write debug CSV uploads:', err);
    }

    const runId = `RUN-${Date.now()}`;
    const output = reconcileDatasets(erpCsv, paymentCsv, bankCsv, options || {}, runId);

    // Save Run to Database
    const runRecord = await prisma.reconciliationRun.create({
      data: {
        id: runId,
        userId,
        name: runName || `Reconciliation Run #${new Date().toLocaleDateString()}`,
        status: 'COMPLETED',
        totalRecords: output.summary.totalRecords,
        matchedRecords: output.summary.matchedRecords,
        exceptionCount: output.summary.exceptionCount,
        matchRate: output.summary.matchRate,
      },
    });

    // Save Reconciled Transactions to DB
    const transactionData = output.transactions.map(t => ({
      transactionId: t.transaction_id,
      runId: runRecord.id,
      userId,
      invoiceId: t.source_record_ids.invoice_id || null,
      paymentId: t.source_record_ids.payment_id || null,
      settlementId: t.source_record_ids.settlement_id || null,
      status: t.status,
      exceptionType: t.exception_type,
      erpAmount: t.erp_amount,
      paymentAmount: t.payment_amount,
      bankAmount: t.bank_amount,
      feeAmount: t.fee_amount,
      difference: t.difference,
      dateDifferenceDays: t.date_difference_days,
      matchingMethod: t.matching_method,
      evidenceJson: JSON.stringify(t.evidence),
      confidenceScore: t.confidence_score,
      resolutionState: t.resolution_state,
    }));

    await prisma.reconciledTransaction.createMany({
      data: transactionData,
    });

    await prisma.auditLog.create({
      data: {
        userId,
        runId: runRecord.id,
        action: 'NEW_RECONCILIATION_RUN',
        details: `Created new reconciliation run ${runId} with ${output.summary.totalRecords} records.`,
      },
    });

    return NextResponse.json({
      success: true,
      runId: runRecord.id,
      summary: output.summary,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Reconciliation execution failed' }, { status: 500 });
  }
}
