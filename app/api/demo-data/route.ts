import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || '150'; // '150' or '400'

    const dir = type === '400'
      ? path.join(process.cwd(), 'data/benchmark-400')
      : path.join(process.cwd(), 'data/demo');

    const erpPath = path.join(dir, 'erp.csv');
    const payPath = path.join(dir, 'payments.csv');
    const bankPath = path.join(dir, 'bank.csv');

    let erpCsv = '';
    let payCsv = '';
    let bankCsv = '';

    if (fs.existsSync(erpPath)) erpCsv = fs.readFileSync(erpPath, 'utf8');
    if (fs.existsSync(payPath)) payCsv = fs.readFileSync(payPath, 'utf8');
    if (fs.existsSync(bankPath)) bankCsv = fs.readFileSync(bankPath, 'utf8');

    return NextResponse.json({
      success: true,
      type,
      erpCsv,
      payCsv,
      bankCsv,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
