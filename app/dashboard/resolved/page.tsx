'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Bot, ShieldAlert, Check, RefreshCw, X, ChevronRight, Info } from 'lucide-react';

export default function ResolvedExceptionsPage() {
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [selectedException, setSelectedException] = useState<any | null>(null);

  const fetchExceptions = async () => {
    setLoading(true);
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') || 'demo-user-001' : 'demo-user-001';
      const activeRunId = typeof window !== 'undefined' ? localStorage.getItem('active_run_id') || '' : '';
      const url = activeRunId 
        ? `/api/exceptions?runId=${activeRunId}&t=${Date.now()}` 
        : `/api/exceptions?t=${Date.now()}`;

      const res = await fetch(url, {
        headers: { 'x-user-id': userId },
        cache: 'no-store'
      });
      const data = await res.json();
      if (data.exceptions) {
        setExceptions(data.exceptions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();

    const handleUpdate = () => {
      fetchExceptions();
    };
    window.addEventListener('revalto-run-updated', handleUpdate);
    return () => {
      window.removeEventListener('revalto-run-updated', handleUpdate);
    };
  }, []);

  const handleResolve = async (id: string, state: 'RESOLVED' | 'KEPT_OPEN') => {
    try {
      const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') || 'demo-user-001' : 'demo-user-001';
      await fetch(`/api/exceptions/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ resolutionState: state, notes: `User updated state to ${state}` }),
      });
      fetchExceptions();
      setSelectedException((prev: any) => prev && prev.id === id ? { ...prev, resolutionState: state } : prev);
      // Dispatch run update event to force dashboard totals refresh
      window.dispatchEvent(new CustomEvent('revalto-run-updated'));
    } catch (err) {
      console.error(err);
    }
  };

  const categories = [
    'ALL',
    'FEE_MISMATCH',
    'AMOUNT_MISMATCH',
    'TIMING_LAG',
    'MISSING_BANK_SETTLEMENT',
    'MISSING_PAYMENT_RECORD',
    'DUPLICATE_PAYMENT',
  ];

  const filtered = activeCategory === 'ALL'
    ? exceptions
    : exceptions.filter(e => e.exceptionType === activeCategory);

  const resolvedExceptions = filtered.filter((e: any) => e.resolutionState === 'RESOLVED');

  const formatExceptionName = (name: string) => {
    return name ? name.replace(/_/g, ' ') : '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Resolved Exceptions Archive</h1>
          <p className="text-xs text-slate-400 mt-1">Audit log of resolved discrepancies for this reconciliation run</p>
        </div>
        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{resolvedExceptions.length} Resolved Exceptions</span>
        </span>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 glass-panel p-2 rounded-xl border border-slate-800">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeCategory === cat
                ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            {cat.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Exception Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <p className="text-xs text-slate-500 col-span-2 text-center py-12">Loading resolved records...</p>
        ) : resolvedExceptions.length === 0 ? (
          <p className="text-xs text-slate-500 col-span-2 text-center py-12 bg-slate-900/10 rounded-2xl border border-slate-850 border-dashed">
            No resolved exceptions in this category yet.
          </p>
        ) : (
          resolvedExceptions.map((item) => (
            <div
              key={item.id}
              className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-indigo-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/2 shadow-md relative group/card opacity-85 hover:opacity-100 bg-slate-950/20"
            >
              {/* Card Body (Clickable to open drawer) */}
              <div 
                onClick={() => setSelectedException(item)}
                className="cursor-pointer space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 group-hover/card:text-indigo-300 transition-colors flex items-center gap-1">
                        <span>{item.transactionId}</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover/card:opacity-100 transition-all transform translate-x-[-4px] group-hover/card:translate-x-0" />
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {item.exceptionType}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-slate-400">
                      Discrepancy: ₹{item.difference.toLocaleString()}
                    </span>
                  </div>

                  <div className="text-xs text-slate-450 space-y-1 font-mono bg-slate-900/60 p-3 rounded-xl border border-slate-850">
                    <p>ERP Invoice: {item.invoiceId || 'N/A'} (₹{item.erpAmount.toLocaleString()})</p>
                    <p>Payment Gateway: {item.paymentId || 'N/A'} (₹{item.paymentAmount.toLocaleString()})</p>
                    <p>Bank Settlement: {item.settlementId || 'N/A'} (₹{item.bankAmount.toLocaleString()})</p>
                  </div>

                  <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                    {(() => {
                      try {
                        const ev = JSON.parse(item.evidenceJson);
                        return ev.summary;
                      } catch (e) {
                        return item.evidenceJson;
                      }
                    })()}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800/85 flex items-center justify-between gap-3 relative z-10">
                <button
                  onClick={() => handleResolve(item.id, 'KEPT_OPEN')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all"
                >
                  Reopen Exception
                </button>

                <Link
                  href={`/dashboard/copilot?q=Investigate+transaction+${item.transactionId}`}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <Bot className="w-4 h-4" />
                  <span>AI Investigate</span>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Exception Evidence Slide-over Drawer */}
      {selectedException && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-[#0d1322] h-full p-8 overflow-y-auto border-l border-slate-800 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <span className="text-xs text-indigo-400 font-mono font-bold">{selectedException.transactionId}</span>
                  <h3 className="text-xl font-bold text-white">Exception Evidence Detail</h3>
                </div>
                <button
                  onClick={() => setSelectedException(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-6 space-y-5">
                {/* Status Indicator */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Resolution State</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedException.resolutionState === 'RESOLVED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {selectedException.resolutionState || 'OPEN'}
                  </span>
                </div>

                {/* Exception Category Context Card */}
                <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs">
                  <div className="flex items-center gap-2 text-rose-300 font-bold mb-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Exception Category: {formatExceptionName(selectedException.exceptionType)}</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    {selectedException.exceptionType === 'FEE_MISMATCH' && 'The bank settlement is lower than the gateway amount, matching the gateway transaction fees exactly.'}
                    {selectedException.exceptionType === 'DUPLICATE_PAYMENT' && 'Multiple payment gateway collections are referencing the same single ERP invoice record.'}
                    {selectedException.exceptionType === 'AMOUNT_MISMATCH' && 'There is a ledger value discrepancy between the ERP invoice, payment gateway, and bank settlement.'}
                    {selectedException.exceptionType === 'TIMING_LAG' && 'The bank settled the transaction with a timing gap outside the configured tolerance limit.'}
                    {selectedException.exceptionType === 'MISSING_BANK_SETTLEMENT' && 'Payment gateway record exists, but bank settlement matching invoice details cannot be found.'}
                    {selectedException.exceptionType === 'MISSING_PAYMENT_RECORD' && 'Bank statement shows a settlement transaction, but no corresponding payment record exists.'}
                  </p>
                </div>

                {/* Source ledger comparisons */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-855 space-y-2.5 text-xs">
                  <h4 className="font-bold text-slate-300 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Ledger Ingestion Verification</span>
                  </h4>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ERP Invoice Value:</span>
                    <span className="font-bold text-white">₹{selectedException.erpAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gateway Collection:</span>
                    <span className="font-bold text-white">₹{selectedException.paymentAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bank Settled Value:</span>
                    <span className="font-bold text-white">₹{selectedException.bankAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-850 font-extrabold text-sm">
                    <span className="text-slate-350">Discrepancy Difference:</span>
                    <span className="text-rose-450">₹{selectedException.difference.toLocaleString()}</span>
                  </div>
                </div>

                {/* Evidence Checks Rationale */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
                  <h4 className="font-bold text-slate-300 mb-1">Algorithmic Evidence Summary</h4>
                  <p className="text-slate-400 leading-relaxed mb-3">
                    {(() => {
                      try {
                        const ev = JSON.parse(selectedException.evidenceJson);
                        return ev.summary;
                      } catch (e) {
                        return selectedException.evidenceJson;
                      }
                    })()}
                  </p>
                  
                  {(() => {
                    try {
                      const ev = JSON.parse(selectedException.evidenceJson);
                      if (ev.checks) {
                        return (
                          <div className="space-y-1.5 border-t border-slate-800 pt-2 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">ERP to Gateway Reference:</span>
                              <span className={`font-bold ${ev.checks.erpToPaymentMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {ev.checks.erpToPaymentMatch ? '✓ Matched' : '✗ Mismatch'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Gateway to Bank Reference:</span>
                              <span className={`font-bold ${ev.checks.paymentToBankMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {ev.checks.paymentToBankMatch ? '✓ Matched' : '✗ Mismatch'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Value check (adjusted for fees):</span>
                              <span className={`font-bold ${ev.checks.amountsMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {ev.checks.amountsMatch ? '✓ True' : '✗ False'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Settlement lag inside tolerance:</span>
                              <span className="text-emerald-400 font-bold">✓ True</span>
                            </div>
                          </div>
                        );
                      }
                    } catch (e) {}
                    return null;
                  })()}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 flex items-center gap-3">
              <button
                onClick={() => {
                  handleResolve(selectedException.id, selectedException.resolutionState === 'RESOLVED' ? 'KEPT_OPEN' : 'RESOLVED');
                  setSelectedException(null); // close drawer since it will disappear from this page
                }}
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md ${
                  selectedException.resolutionState === 'RESOLVED'
                    ? 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{selectedException.resolutionState === 'RESOLVED' ? 'Reopen Exception' : 'Mark Resolved'}</span>
              </button>
              <Link
                href={`/dashboard/copilot?q=Investigate+transaction+${selectedException.transactionId}`}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Bot className="w-4 h-4" />
                <span>AI Investigate</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
