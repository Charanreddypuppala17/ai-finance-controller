'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, Sliders, ArrowRight } from 'lucide-react';

export default function NewReconciliationPage() {
  const router = useRouter();
  const [erpFile, setErpFile] = useState<File | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);

  const [erpText, setErpText] = useState<string>('');
  const [paymentText, setPaymentText] = useState<string>('');
  const [bankText, setBankText] = useState<string>('');

  const [runName, setRunName] = useState<string>('Custom Financial Run #' + new Date().toLocaleDateString());
  const [dateTolerance, setDateTolerance] = useState<number>(3);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, source: 'ERP' | 'PAYMENT' | 'BANK') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (source === 'ERP') {
        setErpFile(file);
        setErpText(content);
      } else if (source === 'PAYMENT') {
        setPaymentFile(file);
        setPaymentText(content);
      } else if (source === 'BANK') {
        setBankFile(file);
        setBankText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSampleData = async () => {
    try {
      // Load pre-generated demo synthetic CSV data from public or API
      const resErp = await fetch('/data/demo/erp.csv').catch(() => null);
      // Fallback inline synthetic datasets if static route isn't configured
      setErpText(`invoice_id,customer_id,amount,invoice_date,status\nINV-1001,CUST-501,20000.00,2026-08-01,POSTED\nINV-1017,CUST-517,20000.00,2026-08-02,POSTED`);
      setPaymentText(`payment_id,invoice_id,amount,payment_date,fee,status\nPAY-1001,INV-1001,20000.00,2026-08-02,0.00,SUCCESS\nPAY-1017,INV-1017,20000.00,2026-08-03,600.00,SUCCESS`);
      setBankText(`settlement_id,payment_id,amount,settlement_date,status\nSET-1001,PAY-1001,20000.00,2026-08-03,SETTLED\nSET-1017,PAY-1017,19400.00,2026-08-04,SETTLED`);
    } catch (err) {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!erpText || !paymentText || !bankText) {
      setError('Please upload or select all three source CSV files (ERP, Payment, and Bank).');
      setLoading(false);
      return;
    }

    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') || 'demo-user-001' : 'demo-user-001';
      const res = await fetch('/api/reconcile', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          erpCsv: erpText,
          paymentCsv: paymentText,
          bankCsv: bankText,
          runName,
          options: { dateToleranceDays: dateTolerance },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reconciliation failed');

      if (typeof window !== 'undefined' && data.runId) {
        window.dispatchEvent(new CustomEvent('revalto-run-updated', { 
          detail: { id: data.runId, totalRecords: data.summary?.totalRecords || 0 } 
        }));
      }
      router.refresh();
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">New Multi-Source Reconciliation</h1>
        <p className="text-xs text-slate-400 mt-1">
          Upload ERP, Payment Gateway, and Bank Settlement CSV records to run 5-level deterministic matching.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Run Configuration Card */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Run Parameters & Tolerance Settings</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Reconciliation Run Name</label>
              <input
                type="text"
                value={runName}
                onChange={(e) => setRunName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Settlement Date Lag Tolerance ({dateTolerance} days)
              </label>
              <input
                type="range"
                min="0"
                max="14"
                value={dateTolerance}
                onChange={(e) => setDateTolerance(Number(e.target.value))}
                className="w-full accent-indigo-500 mt-2"
              />
              <span className="text-[10px] text-slate-500">Flag settlement delays exceeding {dateTolerance} days as timing lag exceptions.</span>
            </div>
          </div>
        </div>

        {/* 3-CSV Upload Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Source 1: ERP */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-indigo-400">1. ERP / Ledger</span>
                {erpText && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Invoices with <code>invoice_id</code>, <code>amount</code>, <code>invoice_date</code>.
              </p>
            </div>

            <label className="cursor-pointer py-4 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl flex flex-col items-center justify-center transition-colors">
              <Upload className="w-6 h-6 text-slate-500 mb-2" />
              <span className="text-xs text-slate-300 font-semibold">
                {erpFile ? erpFile.name : 'Select ERP CSV'}
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e, 'ERP')}
                className="hidden"
              />
            </label>
          </div>

          {/* Source 2: Payment Gateway */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-indigo-400">2. Payment Gateway</span>
                {paymentText && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Gateway transactions with <code>payment_id</code>, <code>fee</code>, <code>invoice_id</code>.
              </p>
            </div>

            <label className="cursor-pointer py-4 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl flex flex-col items-center justify-center transition-colors">
              <Upload className="w-6 h-6 text-slate-500 mb-2" />
              <span className="text-xs text-slate-300 font-semibold">
                {paymentFile ? paymentFile.name : 'Select Payment CSV'}
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e, 'PAYMENT')}
                className="hidden"
              />
            </label>
          </div>

          {/* Source 3: Bank Settlement */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-indigo-400">3. Bank Settlement</span>
                {bankText && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Bank payouts with <code>settlement_id</code>, <code>payment_id</code>, <code>amount</code>.
              </p>
            </div>

            <label className="cursor-pointer py-4 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl flex flex-col items-center justify-center transition-colors">
              <Upload className="w-6 h-6 text-slate-500 mb-2" />
              <span className="text-xs text-slate-300 font-semibold">
                {bankFile ? bankFile.name : 'Select Bank CSV'}
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e, 'BANK')}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleLoadSampleData}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline"
          >
            Or pre-fill with Demo CSV Datasets
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Running Reconciliation Pipeline...</span>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Execute Reconciliation Run</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
