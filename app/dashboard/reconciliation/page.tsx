'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, Sliders, ArrowRight, Download, Sparkles, Database } from 'lucide-react';

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
  const [loadingSample, setLoadingSample] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const countRows = (text: string) => {
    if (!text.trim()) return 0;
    return Math.max(0, text.trim().split('\n').length - 1);
  };

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

  const handleLoadDataset = async (type: '150' | '400') => {
    setLoadingSample(true);
    setError('');
    try {
      const res = await fetch(`/api/demo-data?type=${type}&t=${Date.now()}`);
      const data = await res.json();
      if (!res.ok || !data.erpCsv) {
        throw new Error(data.error || 'Failed to fetch demo dataset');
      }

      setErpText(data.erpCsv);
      setPaymentText(data.payCsv);
      setBankText(data.bankCsv);
      setErpFile({ name: `sample-erp-${type}-events.csv` } as File);
      setPaymentFile({ name: `sample-payments-${type}-events.csv` } as File);
      setBankFile({ name: `sample-bank-${type}-events.csv` } as File);
      setRunName(type === '400' ? `400-Event Financial Benchmark #${Date.now().toString().slice(-4)}` : `150-Event Multi-Source Run #${Date.now().toString().slice(-4)}`);
      setSuccessMessage(`Successfully loaded ${type}-event controlled multi-source dataset! Ready to execute reconciliation.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Error loading sample dataset');
    } finally {
      setLoadingSample(false);
    }
  };

  const handleDownloadSample = (name: string, content: string) => {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAllTemplates = async () => {
    try {
      const res = await fetch(`/api/demo-data?type=150&t=${Date.now()}`);
      const data = await res.json();
      if (data.erpCsv) handleDownloadSample('sample-erp-invoices.csv', data.erpCsv);
      if (data.payCsv) handleDownloadSample('sample-payment-gateway.csv', data.payCsv);
      if (data.bankCsv) handleDownloadSample('sample-bank-statement.csv', data.bankCsv);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!erpText || !paymentText || !bankText) {
      setError('Please upload or prefill all three source CSV files (ERP, Payment Gateway, and Bank Statement).');
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
      if (!res.ok) throw new Error(data.error || 'Reconciliation execution failed');

      if (typeof window !== 'undefined' && data.runId) {
        localStorage.setItem('active_run_id', data.runId);
        localStorage.setItem('active_run_total', String(data.summary?.totalRecords || 0));

        window.dispatchEvent(new CustomEvent('revalto-run-updated', { 
          detail: { id: data.runId, totalRecords: data.summary?.totalRecords || 0, name: runName } 
        }));
      }

      router.refresh();
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Reconciliation execution failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span>New Multi-Source Reconciliation</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload ERP, Payment Gateway, and Bank Settlement CSV records to execute 5-level deterministic ledger matching.
          </p>
        </div>

        {/* Download templates */}
        <button
          type="button"
          onClick={handleDownloadAllTemplates}
          className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Download className="w-3.5 h-3.5 text-indigo-400" />
          <span>Download Sample CSVs</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Quick Pre-fill Banner */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-indigo-500/20 bg-indigo-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Instant Dataset Testing</h3>
            <p className="text-[11px] text-slate-400">Pre-fill all 3 sources with ground-truth audited financial datasets.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            disabled={loadingSample}
            onClick={() => handleLoadDataset('150')}
            className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-indigo-600/30 border border-indigo-500/40 hover:bg-indigo-600/50 text-indigo-200 text-xs font-semibold transition-all disabled:opacity-50"
          >
            {loadingSample ? 'Loading...' : 'Load 150 Events'}
          </button>
          <button
            type="button"
            disabled={loadingSample}
            onClick={() => handleLoadDataset('400')}
            className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-purple-600/30 border border-purple-500/40 hover:bg-purple-600/50 text-purple-200 text-xs font-semibold transition-all disabled:opacity-50"
          >
            {loadingSample ? 'Loading...' : 'Load 400 Events'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        {/* Run Configuration Card */}
        <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-slate-800 space-y-4">
          <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>Run Parameters & Tolerance Settings</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Reconciliation Run Name</label>
              <input
                type="text"
                value={runName}
                onChange={(e) => setRunName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Settlement Date Lag Tolerance Window
                </label>
                <span className="text-xs font-bold text-indigo-400">{dateTolerance} Days</span>
              </div>
              <input
                type="range"
                min="0"
                max="14"
                value={dateTolerance}
                onChange={(e) => setDateTolerance(Number(e.target.value))}
                className="w-full accent-indigo-500 mt-2"
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                Settlements delayed beyond {dateTolerance} days are automatically classified as Timing Lag exceptions.
              </span>
            </div>
          </div>
        </div>

        {/* 3-CSV Upload Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Source 1: ERP */}
          <div className="glass-card rounded-2xl p-4 sm:p-6 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xs font-bold text-indigo-400">1. ERP / Invoices</span>
                {erpText && (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {countRows(erpText)} rows
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-4">
                ERP billing records with <code>invoice_id</code>, <code>amount</code>, <code>invoice_date</code>.
              </p>
            </div>

            <label className="cursor-pointer py-4 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl flex flex-col items-center justify-center transition-colors">
              <Upload className="w-5 sm:w-6 h-5 sm:h-6 text-slate-500 mb-1.5 sm:mb-2" />
              <span className="text-xs text-slate-300 font-semibold text-center px-2 truncate max-w-full">
                {erpFile ? erpFile.name : 'Select ERP CSV'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">.csv format supported</span>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e, 'ERP')}
                className="hidden"
              />
            </label>
          </div>

          {/* Source 2: Payment Gateway */}
          <div className="glass-card rounded-2xl p-4 sm:p-6 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xs font-bold text-purple-400">2. Payment Gateway</span>
                {paymentText && (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {countRows(paymentText)} rows
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Gateway transactions with <code>payment_id</code>, <code>fee</code>, <code>invoice_id</code>.
              </p>
            </div>

            <label className="cursor-pointer py-4 border-2 border-dashed border-slate-800 hover:border-purple-500/50 rounded-xl flex flex-col items-center justify-center transition-colors">
              <Upload className="w-5 sm:w-6 h-5 sm:h-6 text-slate-500 mb-1.5 sm:mb-2" />
              <span className="text-xs text-slate-300 font-semibold text-center px-2 truncate max-w-full">
                {paymentFile ? paymentFile.name : 'Select Payment CSV'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">.csv format supported</span>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e, 'PAYMENT')}
                className="hidden"
              />
            </label>
          </div>

          {/* Source 3: Bank Settlement */}
          <div className="glass-card rounded-2xl p-4 sm:p-6 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xs font-bold text-sky-400">3. Bank Statement</span>
                {bankText && (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {countRows(bankText)} rows
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Bank payouts with <code>settlement_id</code>, <code>payment_id</code>, <code>amount</code>.
              </p>
            </div>

            <label className="cursor-pointer py-4 border-2 border-dashed border-slate-800 hover:border-sky-500/50 rounded-xl flex flex-col items-center justify-center transition-colors">
              <Upload className="w-5 sm:w-6 h-5 sm:h-6 text-slate-500 mb-1.5 sm:mb-2" />
              <span className="text-xs text-slate-300 font-semibold text-center px-2 truncate max-w-full">
                {bankFile ? bankFile.name : 'Select Bank CSV'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">.csv format supported</span>
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Deterministic 5-level matching pipeline enabled</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 sm:px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
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
